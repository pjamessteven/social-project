import { getLogger } from "@/app/lib/logger";
import { isConversationCaptchaRequired } from "@/app/lib/messageCounter";
import { rateLimiter } from "@/app/lib/rateLimit";
import { replayCached } from "@/app/lib/replayCached";
import { OpenAI } from "@llamaindex/openai";
import type {
  ChatResponse,
  ChatResponseChunk,
  CompletionResponse,
  LLMChatParamsNonStreaming,
  LLMChatParamsStreaming,
  LLMCompletionParamsNonStreaming,
  LLMCompletionParamsStreaming,
} from "llamaindex";
import { Agent, fetch as undiciFetch } from "undici";
import { Cache, makeCacheKey, makeHashedKey } from "./cache";

// Force IPv4 for outbound LLM requests. This environment has no routable IPv6,
// and the target (e.g. Hetzner inference) returns an AAAA record before A, so
// Node's default verbatim DNS resolution would try the unreachable IPv6 first
// and hang (ETIMEDOUT). Routing via an undici Agent pinned to IPv4 fixes it.
const ipv4Agent = new Agent({ connect: { family: 4 } as any });

export const ipv4Fetch: typeof fetch = ((input: any, init?: any) =>
  undiciFetch(input as any, { ...init, dispatcher: ipv4Agent } as any)) as any;

/** Holder for the AbortController of the request currently in flight. */
type InflightRef = { current: AbortController | null };

/**
 * ipv4Fetch with a per-client abort handle: every request gets its own
 * AbortController (combined with the SDK's timeout signal) and the latest one
 * is kept in `ref`, so a wedged stream can be torn down from outside the SDK.
 */
function abortableFetch(ref: InflightRef): typeof fetch {
  return ((input: any, init?: any) => {
    const controller = new AbortController();
    ref.current = controller;
    const signal = init?.signal
      ? AbortSignal.any([controller.signal, init.signal])
      : controller.signal;
    return ipv4Fetch(input, { ...init, signal });
  }) as any;
}

/**
 * Providers that recently produced a runaway response, with the time it was
 * seen. Every call for the next RUNAWAY_MEMORY_MS steers away from them up
 * front, so one bad upstream doesn't cost every conversation an aborted
 * attempt (2026-10-21: Relace and Makora ran away repeatedly).
 */
const recentRunaways = new Map<string, number>();
const RUNAWAY_MEMORY_MS =
  Number(process.env.LLM_RUNAWAY_MEMORY_MS) || 15 * 60 * 1000;

const MAX_TOOL_CALLS_PER_RESPONSE =
  Number(process.env.LLM_MAX_TOOL_CALLS_PER_RESPONSE) || 16;

/** Tool-call count of a cached response if it exceeds the runaway cap, else 0. */
function isRunawayResponse(cachedJson: string): number {
  try {
    const toolCalls = (
      (JSON.parse(cachedJson) as ChatResponse)?.message?.options as any
    )?.toolCall;
    const count = Array.isArray(toolCalls) ? toolCalls.length : 0;
    return count > MAX_TOOL_CALLS_PER_RESPONSE ? count : 0;
  } catch {
    return 0;
  }
}

function providersToAvoid(extra: string[] = []): string[] {
  const cutoff = Date.now() - RUNAWAY_MEMORY_MS;
  for (const [provider, seen] of recentRunaways) {
    if (seen < cutoff) recentRunaways.delete(provider);
  }
  return [...new Set([...recentRunaways.keys(), ...extra])];
}

export class CachedOpenAI extends OpenAI {
  private cache: Cache;
  private mode: "detrans_chat";
  private cacheModel: string | undefined;
  private conversationId: string | undefined;
  private requestId: string | undefined;
  private enforceCaptcha: boolean;
  private ranLlm = false;
  private captchaGateConsumed = false;
  private llmBlockedByCaptcha = false;
  private servedFromCache = false;
  private capturedError: Error | null = null;
  private cancelledReason: string | null = null;
  private fallbackInit?: Omit<
    ConstructorParameters<typeof OpenAI>[0],
    "cache" | "mode"
  >;
  private fallbackClient: OpenAI | null = null;
  private inflight: InflightRef;
  private fallbackInflight: InflightRef = { current: null };
  constructor(
    init: ConstructorParameters<typeof OpenAI>[0] & {
      cache: Cache;
      mode: "detrans_chat";
      conversationId?: string;
      requestId?: string;
      enforceCaptcha?: boolean;
      fallback?: ConstructorParameters<typeof OpenAI>[0];
    },
  ) {
    const {
      cache,
      mode,
      conversationId,
      requestId,
      enforceCaptcha,
      fallback,
      ...openAIInit
    } = init;
    // Route LLM connections over IPv4 (ipv4Fetch above), with an abort
    // handle so a silent stream can be cut off (see drainStream).
    const inflight: InflightRef = { current: null };
    openAIInit.additionalSessionOptions = {
      ...(openAIInit.additionalSessionOptions as any),
      fetch: abortableFetch(inflight) as any,
    };
    // The SDK retries connection failures and header timeouts itself; the
    // library default of 10 attempts (x 60s) would hide a dead provider for
    // ten minutes. Two attempts, then our own retry/fallback takes over.
    openAIInit.maxRetries ??= 2;
    super(openAIInit);
    this.inflight = inflight;
    this.cache = cache;
    this.mode = mode;
    // Include the output budget in the cache identity: admins get a much
    // larger maxTokens and their (longer) completions must not be replayed to
    // default-budget users, or vice versa.
    this.cacheModel = openAIInit.model
      ? `${openAIInit.model}:${openAIInit.maxTokens ?? "default"}`
      : undefined;
    this.conversationId = conversationId;
    this.requestId = requestId;
    this.enforceCaptcha = enforceCaptcha ?? false;
    if (fallback) {
      this.fallbackInit = {
        ...fallback,
        maxRetries: fallback.maxRetries ?? 2,
        additionalSessionOptions: {
          ...(fallback.additionalSessionOptions as any),
          fetch: abortableFetch(this.fallbackInflight) as any,
        },
      };
    }
  }

  /**
   * Tear down the HTTP request currently in flight (primary or fallback).
   * The SDK stream then throws, which unwinds the library's stream generator
   * even when it is parked waiting for a provider that will never answer.
   */
  private abortInflight(reason: Error) {
    for (const ref of [this.inflight, this.fallbackInflight]) {
      const controller = ref.current;
      ref.current = null;
      if (controller && !controller.signal.aborted) controller.abort(reason);
    }
  }

  private getFallbackClient(): OpenAI | null {
    if (!this.fallbackInit) return null;
    if (!this.fallbackClient) {
      this.fallbackClient = new OpenAI(this.fallbackInit);
    }
    return this.fallbackClient;
  }

  /**
   * Whether the given error is transient (rate limit, 5xx, or network
   * timeout/reset). These are candidates for retrying on the fallback provider.
   */
  private isTransientError(err: unknown): boolean {
    const e = err as any;
    if (!e) return false;
    const status = e.status ?? e.response?.status;
    if (typeof status === "number") {
      if (status === 429) return true;
      if (status >= 500) return true;
    }
    const code = e.code ?? e.error?.code;
    if (
      code === "ETIMEDOUT" ||
      code === "ECONNRESET" ||
      code === "ECONNREFUSED"
    ) {
      return true;
    }
    const name = e.name;
    if (name === "TimeoutError" || name === "AbortError") return true;
    const msg = e.message ? String(e.message) : "";
    return /429|rate ?limit|timeout|econnreset|etimedout/i.test(msg);
  }

  get metadata() {
    return {
      ...super.metadata,
      contextWindow: 256000, // Set Kimi K2's actual context window
    };
  }

  /**
   * Whether a real (non-cached) LLM call was made on this instance.
   */
  get didRunLlm() {
    return this.ranLlm;
  }

  /**
   * Whether the conversation captcha gate blocked the LLM. Set (instead of
   * throwing) on the first cache-miss LLM call when the conversation requires
   * CAPTCHA, so no model cost is incurred and the workflow ends gracefully
   * instead of raising an error the workflow stream cannot propagate.
   */
  get captchaBlocked() {
    return this.llmBlockedByCaptcha;
  }

  /**
   * Whether the current request was fully served from cache (a cache hit on
   * the first LLM call), meaning no LLM call will run and no CAPTCHA applies.
   */
  get didServeFromCache() {
    return this.servedFromCache;
  }

  /**
   * Cancel this LLM (and thereby the agent loop that drives it): every
   * subsequent chat()/complete() call returns an empty benign response, which
   * makes the agent workflow finish with no tool calls (stopAgentEvent) instead
   * of continuing to burn tokens with nobody listening. Also aborts an
   * in-flight stream at the next chunk.
   *
   * The workflow runtime's own AbortController is NOT sufficient for this —
   * nothing in @llamaindex/workflow consumes its signal to stop the loop.
   */
  cancel(reason = "cancelled") {
    if (this.cancelledReason === null) {
      this.cancelledReason = reason;
      console.warn(`[CachedOpenAI] LLM cancelled: ${reason}`);
      // Release the socket now rather than at the next chunk (which, for a
      // silent provider, never comes).
      this.abortInflight(new Error(`LLM cancelled: ${reason}`));
    }
  }

  get isCancelled(): boolean {
    return this.cancelledReason !== null;
  }

  get cancelReason(): string | null {
    return this.cancelledReason;
  }

  /**
   * The last error captured from an underlying LLM call, if any. Recorded
   * (instead of throwing into the workflow) so the agent completes gracefully
   * and the stream ends, letting the caller surface the error to the client.
   */
  get lastError(): Error | null {
    return this.capturedError;
  }

  /**
   * Records the first LLM error for this instance. Subsequent errors are
   * ignored so the first (root-cause) error is what gets surfaced.
   */
  private recordError(err: unknown) {
    if (this.capturedError) return;
    this.capturedError = err instanceof Error ? err : new Error(String(err));
  }

  /**
   * Returns the recorded error and clears it. The route calls this after the
   * stream completes to convert a swallowed LLM error back into a stream error.
   */
  takeError(): Error | null {
    const err = this.capturedError;
    this.capturedError = null;
    return err;
  }

  /**
   * Opens a streaming LLM connection, falling back to the secondary provider
   * on transient failures. Returns null when every provider failed (the error
   * is recorded on the instance).
   */
  private async openStreamWithFallback(
    messages: LLMChatParamsStreaming["messages"],
    options: Record<string, unknown>,
    ignoreProviders: string[] = [],
  ): Promise<AsyncGenerator<ChatResponseChunk> | null> {
    // A retry after a runaway response steers OpenRouter away from the
    // provider that produced it (per-call options are merged over the
    // instance's additionalChatOptions, so only `provider` needs restating).
    let callOptions = options;
    const avoid = providersToAvoid(ignoreProviders);
    if (avoid.length > 0) {
      const base = ((this.additionalChatOptions as any)?.provider ?? {}) as {
        ignore?: string[];
      };
      callOptions = {
        ...options,
        additionalChatOptions: {
          ...((options.additionalChatOptions as object) ?? {}),
          provider: {
            ...base,
            ignore: [...new Set([...(base.ignore ?? []), ...avoid])],
          },
        },
      };
    }
    try {
      // Call underlying LLM in streaming mode
      return (await super.chat({
        messages,
        stream: true,
        ...callOptions,
      } as LLMChatParamsStreaming)) as AsyncGenerator<ChatResponseChunk>;
    } catch (err) {
      // On transient failure (429/5xx/timeout), retry on the fallback provider.
      const fallback = this.getFallbackClient();
      if (this.isTransientError(err) && fallback) {
        try {
          const stream = (await fallback.chat({
            messages,
            stream: true,
            ...callOptions,
          } as any)) as AsyncGenerator<ChatResponseChunk>;
          console.warn(
            "[CachedOpenAI] Primary provider failed, using fallback provider",
            String((err as Error)?.message || err),
          );
          return stream;
        } catch (fallbackErr) {
          this.recordError(fallbackErr);
          return null;
        }
      }
      this.recordError(err);
      return null;
    }
  }

  /**
   * One-shot captcha gate. Consumed on the first cache-miss LLM call. Returns
   * true when the conversation requires CAPTCHA (the caller must return a
   * benign response instead of calling the LLM).
   */
  private async shouldBlockConversation(): Promise<boolean> {
    if (this.captchaGateConsumed) return false;
    this.captchaGateConsumed = true;

    if (this.enforceCaptcha && this.conversationId) {
      return await isConversationCaptchaRequired(this.conversationId);
    }
    return false;
  }

  private async fetchGenerationMetadata(generationId: string): Promise<{
    totalCost?: number;
    tokensPrompt?: number;
    tokensCompletion?: number;
    model?: string;
  } | null> {
    // Wait a bit for OpenRouter to process the generation
    await new Promise((res) => setTimeout(res, 1000));

    try {
      const response = await fetch(
        `https://openrouter.ai/api/v1/generation?id=${generationId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        console.warn(
          `Failed to fetch generation metadata for genId ${generationId}: ${response.status}`,
        );
        return null;
      }

      const data = await response.json();
      return {
        totalCost: data.data.total_cost,
        tokensPrompt: data.data.tokens_prompt,
        tokensCompletion: data.data.tokens_completion,
        model: data.data.model,
      };
    } catch (error) {
      console.warn("Error fetching generation metadata:", error);
      return null;
    }
  }

  /* ---------- chat ---------- */
  async chat(
    params: LLMChatParamsStreaming,
  ): Promise<AsyncGenerator<ChatResponseChunk>>;
  async chat(params: LLMChatParamsNonStreaming): Promise<ChatResponse>;
  async chat(
    params: LLMChatParamsStreaming | LLMChatParamsNonStreaming,
  ): Promise<ChatResponse | AsyncGenerator<ChatResponseChunk>> {
    const { messages, stream, ...options } = params;
    const lastMessage = messages[messages.length - 1];
    const lastUserMessage = String(lastMessage.content).slice(0, 100);

    // Create cache key from messages and options
    const key = makeCacheKey(messages, options, this.mode, this.cacheModel);
    const hashedKey = makeHashedKey(key);

    const logger = getLogger();

    /* --- Streaming mode --- */
    if (stream) {
      // Cancelled runs must not touch the cache or the model: return an empty
      // benign stream so the agent workflow ends with no tool calls.
      if (this.cancelledReason !== null) {
        return (async function* (): AsyncGenerator<ChatResponseChunk> {})();
      }

      // Check cache first. A cached response carrying a runaway tool-call
      // list (written before the runaway guard existed) would replay the
      // runaway on every identical conversation prefix, so such entries are
      // dropped and regenerated instead.
      let cached = await this.cache.get(hashedKey);
      if (cached) {
        const poisoned = isRunawayResponse(cached);
        if (poisoned) {
          console.warn(
            `[CachedOpenAI] dropping cached response with ${poisoned} tool calls (runaway) for ${hashedKey}`,
          );
          await this.cache.delete?.(hashedKey);
          cached = null;
        }
      }

      if (cached) {
        logger.info(
          {
            lastUserMessage,
            hashedKey,
            mode: this.mode,
            type: "chat_streaming",
            contentLength: cached.length,
          },
          "LLM cache hit (streaming)",
        );
        this.servedFromCache = true;

        // Parse the cached full response object
        const cachedResponse = JSON.parse(cached) as ChatResponse;
        const content = cachedResponse.message?.content;
        const text =
          typeof content === "string" ? content : JSON.stringify(content);
        const cachedToolCalls = (cachedResponse.message?.options as any)
          ?.toolCall;

        // Replay the cached result as a fake stream
        const replayStream =
          async function* (): AsyncGenerator<ChatResponseChunk> {
            // If there are tool calls, yield them first as a separate chunk
            // so the agent framework always sees them, even when text is empty
            if (cachedToolCalls && cachedToolCalls.length > 0) {
              yield {
                delta: "",
                raw: null,
                options: { toolCall: cachedToolCalls },
              } as ChatResponseChunk;
            }
            // Yield the text content using replayCached
            for await (const chunk of replayCached(text)) {
              yield {
                ...chunk,
                options:
                  cachedToolCalls && cachedToolCalls.length > 0
                    ? { toolCall: cachedToolCalls }
                    : {},
              } as ChatResponseChunk;
            }
          };

        return replayStream();
      }

      logger.info(
        { hashedKey, type: "chat_streaming" },
        "LLM cache miss, generating new (streaming)",
      );

      // Captcha gate: one-shot, before any LLM cost. If blocked, return an
      // empty benign stream (workflow ends gracefully, nothing is cached).
      const blocked = await this.shouldBlockConversation();
      if (blocked) {
        this.llmBlockedByCaptcha = true;
        return (async function* (): AsyncGenerator<ChatResponseChunk> {})();
      }
      this.ranLlm = true;

      const rawStream = await this.openStreamWithFallback(messages, options);
      if (!rawStream) {
        // Every provider failed (error already recorded). End gracefully so
        // the workflow completes instead of hanging.
        return (async function* (): AsyncGenerator<ChatResponseChunk> {})();
      }

      // Drain one raw stream into text + tool calls, yielding every chunk. A
      // stream that completes with NO text and NO tool calls is a silent
      // failure (e.g. reasoning burned the whole max_tokens budget and the
      // provider returned finish_reason=length with empty content) — those
      // are retried exactly once upstream, and a second empty stream surfaces
      // as an error instead of being saved as an empty assistant message.
      const drainStream = async function* (
        this: CachedOpenAI,
        rawStream: AsyncGenerator<ChatResponseChunk>,
      ): AsyncGenerator<
        ChatResponseChunk,
        {
          fullText: string;
          toolCalls: any[];
          generationId?: string;
          lastChunk?: ChatResponseChunk;
          finishReason?: string;
          usage: any;
          errored: boolean;
          cancelled: boolean;
          /** Provider that produced a runaway response (to avoid on retry). */
          badProvider?: string;
        }
      > {
        let fullText = "";
        const toolCalls: any[] = [];
        let generationId: string | undefined;
        let lastChunk: ChatResponseChunk | undefined;
        let finishReason: string | undefined;
        let usage: any;
        let errored = false;
        let cancelled = false;

        // Inactivity budget per LLM stream. Mimo pro regularly falls silent
        // for several minutes mid-generation (long synthesis/thinking pauses
        // after big tool-result rounds), so the idle gap we tolerate must be
        // generous — a too-tight budget kills wiki deep-research runs midway.
        const STREAM_TIMEOUT_MS =
          Number(process.env.LLM_STREAM_TIMEOUT_MS) || 600_000;
        // Budget for the FIRST chunk, separately and much tighter: a
        // provider that accepts the request (200, event-stream) and then
        // never sends a byte is a routing failure, not a thinking pause. The
        // generous mid-stream budget above let such calls hang the chat for
        // ten minutes (2026-10-21, OpenRouter upstream for mimo-v2.6-flash).
        // Timing out here ends the attempt empty, which the caller retries
        // once on a fresh connection. "First chunk" means the first chunk
        // with text or a tool call: stalled streams often deliver an empty
        // role/keepalive chunk first, and that must not switch us over to the
        // generous mid-stream budget.
        const FIRST_CHUNK_TIMEOUT_MS =
          Number(process.env.LLM_FIRST_CHUNK_TIMEOUT_MS) || 45_000;
        let meaningfulChunks = 0;
        // Runaway guard: on some OpenRouter upstreams the model never stops
        // emitting new tool calls (2026-10-21: 1,500+ distinct calls in 40s,
        // 560 KB of stream, no end). Every chunk counts as progress, so no
        // inactivity budget catches it; cap the distinct tool calls in one
        // response instead and retry elsewhere.
        const iterator = (rawStream as AsyncGenerator<ChatResponseChunk>)[
          Symbol.asyncIterator
        ]();
        let lastChunkTime = Date.now();
        let chunkCount = 0;
        const debugStream = process.env.LLM_DEBUG_STREAM === "1";
        const streamStart = Date.now();

        while (true) {
          // Cancellation (client disconnect, superseded turn, loop guard, time
          // limit): drop the in-flight stream immediately and report it so the
          // caller neither caches nor retries a partial response.
          if (this.cancelledReason !== null) {
            cancelled = true;
            try {
              await iterator.return?.(undefined as any);
            } catch {}
            break;
          }

          let result: IteratorResult<ChatResponseChunk>;
          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          if (debugStream) {
            console.log(
              `[drain] +${((Date.now() - streamStart) / 1000).toFixed(1)}s next() chunks=${chunkCount} meaningful=${meaningfulChunks} sinceLast=${((Date.now() - lastChunkTime) / 1000).toFixed(1)}s`,
            );
          }
          try {
            result = await Promise.race([
              iterator.next(),
              new Promise<never>((_, reject) => {
                const budget =
                  meaningfulChunks === 0
                    ? FIRST_CHUNK_TIMEOUT_MS
                    : STREAM_TIMEOUT_MS;
                const remaining = budget - (Date.now() - lastChunkTime);
                if (remaining <= 0) {
                  reject(new Error("LLM stream timeout: no chunks received"));
                  return;
                }
                timeoutId = setTimeout(
                  () =>
                    reject(
                      new Error(
                        meaningfulChunks === 0
                          ? `LLM stream timeout: no content within ${Math.round(budget / 1000)}s (${chunkCount} empty chunks)`
                          : `LLM stream timeout: no chunks for ${Math.round(budget / 1000)}s after ${chunkCount} chunks`,
                      ),
                    ),
                  remaining,
                );
              }),
            ]);
          } catch (err) {
            // Tear down the wedged request so the SDK stream and the library
            // generator unwind, then end this attempt gracefully (the
            // workflow must complete, not hang). Never await
            // iterator.return() here: a generator suspended on an internal
            // await can't honour return() until that await settles, and for
            // a silent provider it never does (that wait is what turned the
            // 2026-10-21 stalls into ten-minute hangs).
            const error = err instanceof Error ? err : new Error(String(err));
            console.warn(
              `[CachedOpenAI] ${error.message} — aborting the request (chunks=${chunkCount})`,
            );
            this.abortInflight(error);
            Promise.resolve(iterator.return?.(undefined as any)).catch(
              () => {},
            );
            if (this.cancelledReason !== null) {
              cancelled = true;
              return {
                fullText,
                toolCalls,
                generationId,
                lastChunk,
                finishReason,
                usage,
                errored,
                cancelled,
              };
            }
            this.recordError(err);
            errored = true;
            return {
              fullText,
              toolCalls,
              generationId,
              lastChunk,
              finishReason,
              usage,
              errored,
              cancelled,
            };
          } finally {
            clearTimeout(timeoutId);
          }

          if (result.done) break;

          const chunk = result.value;
          chunkCount++;
          if (debugStream) {
            console.log(
              `[drain] +${((Date.now() - streamStart) / 1000).toFixed(1)}s chunk #${chunkCount} delta=${JSON.stringify((chunk.delta ?? "").slice(0, 40))} tool=${JSON.stringify((chunk.options as any)?.toolCall ?? null).slice(0, 220)}`,
            );
          }
          fullText += chunk.delta;
          // Only real progress resets the inactivity clock: an empty chunk
          // (role announcement, keepalive) from a provider that then goes
          // silent must still hit the first-content budget.
          if (chunk.delta || (chunk.options as any)?.toolCall) {
            meaningfulChunks++;
            lastChunkTime = Date.now();
          }

          // Collect tool calls if present
          const chunkOptions = chunk.options as any;
          if (chunkOptions?.toolCall) {
            // Handle both single tool call and array of tool calls (flatten nested arrays)
            const calls = Array.isArray(chunkOptions.toolCall)
              ? chunkOptions.toolCall.flat()
              : [chunkOptions.toolCall];

            for (const call of calls) {
              // Some upstreams send tool calls without ids — synthesize one so
              // the call is never silently dropped.
              if (!call.id) {
                call.id = `call-synthetic-${toolCalls.length}-${chunkCount}`;
              }
              const toolCallId = call.id;
              // Overwrite existing entry with latest version (which has fully parsed input)
              const existingIndex = toolCalls.findIndex(
                (t) => t.id === toolCallId,
              );
              if (existingIndex >= 0) {
                toolCalls[existingIndex] = call;
              } else {
                toolCalls.push(call);
              }
            }
          }

          if (toolCalls.length > MAX_TOOL_CALLS_PER_RESPONSE) {
            const provider = (chunk.raw as any)?.provider as string | undefined;
            const error = new Error(
              `Runaway tool calls: ${toolCalls.length} distinct calls in one response${provider ? ` (provider ${provider})` : ""}`,
            );
            console.warn(`[CachedOpenAI] ${error.message} — aborting the request`);
            if (provider) recentRunaways.set(provider, Date.now());
            this.abortInflight(error);
            Promise.resolve(iterator.return?.(undefined as any)).catch(
              () => {},
            );
            this.recordError(error);
            errored = true;
            return {
              fullText: "",
              toolCalls: [],
              generationId,
              lastChunk,
              finishReason,
              usage,
              errored,
              cancelled,
              badProvider: provider,
            };
          }

          // Extract generation ID if available
          if (!generationId && chunk.raw && "id" in chunk.raw) {
            generationId = (chunk.raw as any).id;
          }

          // Capture finish reason and token usage when the provider reports
          // them (OpenRouter puts usage on the final chunk).
          const rawChunk = chunk.raw as any;
          if (rawChunk?.choices?.[0]?.finish_reason) {
            finishReason = rawChunk.choices[0].finish_reason;
          }
          if (rawChunk?.usage) {
            usage = rawChunk.usage;
          }

          lastChunk = chunk;
          // Text streams through live; tool calls are held back and handed
          // over as one chunk once the response has completed cleanly (the
          // same shape the cache replay uses). A response that is cut off
          // (runaway, timeout, cancel) therefore never leaks half a list of
          // tool calls to the agent.
          if (chunkOptions?.toolCall) {
            if (chunk.delta) {
              yield { ...chunk, options: {} } as ChatResponseChunk;
            }
          } else {
            yield chunk;
          }
        }
        if (toolCalls.length > 0) {
          yield {
            delta: "",
            raw: lastChunk?.raw ?? null,
            options: { toolCall: toolCalls },
          } as ChatResponseChunk;
        }
        return {
          fullText,
          toolCalls,
          generationId,
          lastChunk,
          finishReason,
          usage,
          errored,
          cancelled,
        };
      }.bind(this);

      const captureStream = async function* (
        this: CachedOpenAI,
      ): AsyncGenerator<ChatResponseChunk> {
        let result = yield* drainStream.call(this, rawStream);

        // Cancelled mid-stream (client disconnect, superseded turn, loop
        // guard, time limit): drop the partial response — no retry, no cache
        // write, no recorded error.
        if (result.cancelled) return;

        // Nothing usable came back (no text, no tools) — a silent-empty
        // stream, one that timed out before any content, or a runaway that
        // was cut off. Retry with a fresh connection, avoiding any provider
        // that ran away, before declaring failure.
        const MAX_STREAM_RETRIES =
          Number(process.env.LLM_MAX_STREAM_RETRIES) || 2;
        const avoidProviders: string[] = [];
        for (let attempt = 1; attempt <= MAX_STREAM_RETRIES; attempt++) {
          if (result.cancelled) return;
          if (result.fullText.trim() || result.toolCalls.length > 0) break;
          if (result.badProvider) avoidProviders.push(result.badProvider);
          console.warn(
            `[CachedOpenAI] empty stream (errored=${result.errored}, finish_reason=${result.finishReason ?? "unknown"}) — retry ${attempt}/${MAX_STREAM_RETRIES}${avoidProviders.length ? ` avoiding ${avoidProviders.join(", ")}` : ""}`,
          );
          // Discard the stale error from the dead attempt so a successful
          // retry is not poisoned by it.
          this.takeError();
          const retryStream = await this.openStreamWithFallback(
            messages,
            options,
            avoidProviders,
          );
          if (!retryStream) break;
          result = yield* drainStream.call(this, retryStream);
        }

        if (result.cancelled) return;

        // Guardrail: reasoning must stay disabled (see additionalChatOptions).
        // If it ever leaks back on it silently eats max_tokens and produces
        // empty responses — make that loudly visible in the logs.
        const reasoningTokens: number =
          result.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
        if (reasoningTokens > 0) {
          console.warn(
            `[CachedOpenAI] ${reasoningTokens} reasoning tokens generated despite disable — check additionalChatOptions`,
          );
        }

        console.log("TOOLA CALLS: ", JSON.stringify(result.toolCalls));

        // Never let a fully empty response pass as success: surface it as a
        // retryable error instead of saving an empty assistant message.
        if (!result.fullText.trim() && result.toolCalls.length === 0) {
          this.recordError(
            new Error(
              `The model returned an empty response (finish_reason=${result.finishReason ?? "unknown"}, reasoningTokens=${reasoningTokens}). Please retry.`,
            ),
          );
          return;
        }

        // Build the complete response object
        const response: ChatResponse = {
          message: {
            role: "assistant",
            content: result.fullText,
            ...(result.toolCalls.length > 0
              ? { options: { toolCall: result.toolCalls } }
              : {}),
          },
          raw: result.lastChunk?.raw || null,
        };

        // Fetch and store metadata
        const metadata = await this.prepareMetadata(
          result.generationId,
          response,
        );

        // Cache the full response object
        await this.cache.set(
          hashedKey,
          key,
          JSON.stringify(response),
          lastUserMessage,
          metadata,
        );
      }.bind(this);

      return captureStream();
    }

    /* --- Non-streaming mode --- */
    // Cancelled runs must not touch the cache or the model.
    if (this.cancelledReason !== null) {
      return {
        message: { role: "assistant", content: "" },
        raw: null,
      } as ChatResponse;
    }
    // Check cache first
    const cached = await this.cache.get(hashedKey);

    if (cached) {
      logger.info(
        {
          lastUserMessage,
          hashedKey,
          mode: this.mode,
          type: "chat",
          contentLength: cached.length,
        },
        "LLM cache hit",
      );
      this.servedFromCache = true;

      // Return the cached full response object
      return JSON.parse(cached) as ChatResponse;
    }

    // Captcha gate: one-shot, before any LLM cost. If blocked, return an
    // empty benign response (nothing is cached).
    const blocked = await this.shouldBlockConversation();
    if (blocked) {
      this.llmBlockedByCaptcha = true;
      return {
        message: { role: "assistant", content: "" },
        raw: null,
      } as ChatResponse;
    }
    this.ranLlm = true;

    let response;
    try {
      // Generate new response
      response = await super.chat({ messages, ...options });
    } catch (err) {
      // On transient failure (429/5xx/timeout), retry on the fallback provider.
      const fallback = this.getFallbackClient();
      if (this.isTransientError(err) && fallback) {
        try {
          response = await fallback.chat({ messages, ...options });
          console.warn(
            "[CachedOpenAI] Primary provider failed, using fallback provider (non-streaming)",
            String((err as Error)?.message || err),
          );
        } catch (fallbackErr) {
          this.recordError(fallbackErr);
          return {
            message: { role: "assistant", content: "" },
            raw: null,
          } as ChatResponse;
        }
      } else {
        this.recordError(err);
        return {
          message: { role: "assistant", content: "" },
          raw: null,
        } as ChatResponse;
      }
    }

    // Fetch and store metadata
    const metadata = await this.prepareMetadata(
      response.raw && "id" in response.raw
        ? (response.raw as any).id
        : undefined,
      response,
    );

    // Cache the full response object
    await this.cache.set(
      hashedKey,
      key,
      JSON.stringify(response),
      lastUserMessage,
      metadata,
    );

    logger.info(
      { lastUserMessage, hashedKey, mode: this.mode, type: "chat" },
      "LLM cache generating new",
    );

    return response;
  }
  /* ---------- complete ---------- */
  async complete(
    params: LLMCompletionParamsNonStreaming & {
      rateLimit?: { userIp: string; mode: string };
    },
  ): Promise<CompletionResponse>;
  async complete(
    params: LLMCompletionParamsStreaming & {
      rateLimit?: { userIp: string; mode: string };
    },
  ): Promise<AsyncIterable<CompletionResponse>>;
  async complete(
    params: (LLMCompletionParamsStreaming | LLMCompletionParamsNonStreaming) & {
      rateLimit?: { userIp: string; mode: string };
    },
  ): Promise<CompletionResponse | AsyncIterable<CompletionResponse>> {
    const { prompt, responseFormat, stream, rateLimit, ...options } = params;

    // Convert prompt to string for caching
    const promptString =
      typeof prompt === "string" ? prompt : JSON.stringify(prompt);
    const lastUserMessage = promptString.slice(0, 100);

    // Create messages-like structure for consistent caching
    const messages = [{ role: "user", content: promptString }];

    const key = makeCacheKey(messages, options, this.mode, this.cacheModel);
    const hashedKey = makeHashedKey(key);

    const logger = getLogger();

    // Check rate limit if specified
    if (
      rateLimit &&
      !(await rateLimiter(rateLimit.userIp, rateLimit.mode)).allowed
    ) {
      throw new Error("Rate limit exceeded");
    }

    // Cancelled runs must not touch the cache or the model.
    if (this.cancelledReason !== null) {
      return stream
        ? ((async function* (): AsyncIterable<CompletionResponse> {})() as any)
        : ({ text: "", raw: null } as CompletionResponse);
    }

    /* --- Streaming mode --- */
    if (stream) {
      // Check cache first. A cached response carrying a runaway tool-call
      // list (written before the runaway guard existed) would replay the
      // runaway on every identical conversation prefix, so such entries are
      // dropped and regenerated instead.
      let cached = await this.cache.get(hashedKey);
      if (cached) {
        const poisoned = isRunawayResponse(cached);
        if (poisoned) {
          console.warn(
            `[CachedOpenAI] dropping cached response with ${poisoned} tool calls (runaway) for ${hashedKey}`,
          );
          await this.cache.delete?.(hashedKey);
          cached = null;
        }
      }

      if (cached) {
        logger.info(
          {
            lastUserMessage,
            hashedKey,
            mode: this.mode,
            type: "complete_streaming",
            contentLength: cached.length,
          },
          "LLM cache hit (streaming)",
        );

        // Parse the cached full response object
        const cachedResponse = JSON.parse(cached) as CompletionResponse;
        const text = cachedResponse.text || "";

        // Replay the cached text as a stream
        const replayStream =
          async function* (): AsyncIterable<CompletionResponse> {
            for await (const chunk of replayCached(text)) {
              yield {
                text: chunk.delta,
                raw: null,
              } as CompletionResponse;
            }
          };

        return replayStream();
      }

      logger.info(
        { hashedKey, type: "complete_streaming" },
        "LLM cache miss, generating new (streaming)",
      );

      // Call underlying LLM in streaming mode
      let rawStream;
      try {
        rawStream = await super.complete({
          prompt,
          responseFormat,
          stream: true,
          ...options,
        });
      } catch (err) {
        this.recordError(err);
        return (async function* (): AsyncIterable<CompletionResponse> {})();
      }

      // Capture the stream and build a full response object
      const captureStream = async function* (
        this: CachedOpenAI,
      ): AsyncIterable<CompletionResponse> {
        let fullText = "";
        let generationId: string | undefined;
        let lastChunk: CompletionResponse | undefined;

        try {
          for await (const chunk of rawStream as AsyncIterable<CompletionResponse>) {
            fullText += chunk.text || "";

            // Extract generation ID if available
            if (!generationId && chunk.raw && "id" in chunk.raw) {
              generationId = (chunk.raw as any).id;
            }

            lastChunk = chunk;
            yield chunk;
          }
        } catch (err) {
          this.recordError(err);
          return;
        }

        // Build the complete response object
        const response: CompletionResponse = {
          text: fullText,
          raw: lastChunk?.raw || null,
        };

        // Fetch and store metadata
        const metadata = await this.prepareMetadata(generationId, response);

        // Cache the full response object
        await this.cache.set(
          hashedKey,
          key,
          JSON.stringify(response),
          lastUserMessage,
          metadata,
        );
      }.bind(this);

      return captureStream();
    }

    /* --- Non-streaming mode --- */
    // Check cache first
    const cached = await this.cache.get(hashedKey);

    if (cached) {
      logger.info(
        {
          lastUserMessage,
          hashedKey,
          mode: this.mode,
          type: "complete",
          contentLength: cached.length,
        },
        "LLM cache hit",
      );

      // Return the cached full response object
      return JSON.parse(cached) as CompletionResponse;
    }

    logger.info(
      { hashedKey, type: "complete" },
      "LLM cache miss, generating new",
    );

    // Generate new response
    let response;
    try {
      response = await super.complete({
        prompt,
        responseFormat,
        ...options,
      });
    } catch (err) {
      this.recordError(err);
      return { text: "", raw: null } as CompletionResponse;
    }

    // Fetch and store metadata
    const metadata = await this.prepareMetadata(
      response.raw && "id" in response.raw
        ? (response.raw as any).id
        : undefined,
      response,
    );

    // Cache the full response object
    await this.cache.set(
      hashedKey,
      key,
      JSON.stringify(response),
      lastUserMessage,
      metadata,
    );

    return response;
  }

  /* ---------- Helper methods ---------- */
  private async prepareMetadata(
    generationId: string | undefined,
    response: ChatResponse | CompletionResponse,
  ): Promise<{
    totalCost?: number;
    tokensPrompt?: number;
    tokensCompletion?: number;
    model?: string;
    generationId?: string;
    conversationId?: string;
    requestId?: string;
  }> {
    const metadata: any = {};

    metadata.conversationId = this.conversationId;
    metadata.requestId = this.requestId;

    // Add generation ID if available
    if (generationId) {
      metadata.generationId = generationId;

      // Fetch metadata from OpenRouter
      /*
      const generationMetadata =
        await this.fetchGenerationMetadata(generationId);
      if (generationMetadata) {
        Object.assign(metadata, generationMetadata);
      }
        */
    }

    // Add token counts from response if available
    if (response.raw && "usage" in response.raw) {
      const usage = (response.raw as any).usage;
      if (usage) {
        metadata.tokensPrompt = usage.prompt_tokens;
        metadata.tokensCompletion = usage.completion_tokens;
      }
    }

    return metadata;
  }
}

export class CustomOpenAI extends OpenAI {
  private contextWindowSize: number;

  constructor(
    init: ConstructorParameters<typeof OpenAI>[0] & {
      contextWindow?: number;
    },
  ) {
    const { contextWindow, ...openAIInit } = init;
    super(openAIInit);
    this.contextWindowSize = contextWindow ?? 128000;
  }

  get metadata() {
    return {
      ...super.metadata,
      contextWindow: this.contextWindowSize,
    };
  }
}
