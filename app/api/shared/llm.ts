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
import { Cache, makeCacheKey, makeHashedKey } from "./cache";
import { Agent, fetch as undiciFetch } from "undici";

// Force IPv4 for outbound LLM requests. This environment has no routable IPv6,
// and the target (e.g. Hetzner inference) returns an AAAA record before A, so
// Node's default verbatim DNS resolution would try the unreachable IPv6 first
// and hang (ETIMEDOUT). Routing via an undici Agent pinned to IPv4 fixes it.
const ipv4Agent = new Agent({ connect: { family: 4 } as any });

export const ipv4Fetch: typeof fetch = ((input: any, init?: any) =>
  undiciFetch(input as any, { ...init, dispatcher: ipv4Agent } as any)) as any;

export class CachedOpenAI extends OpenAI {
  private cache: Cache;
  private mode: "detrans_chat";
  private conversationId: string | undefined;
  private requestId: string | undefined;
  private enforceCaptcha: boolean;
  private ranLlm = false;
  private captchaGateConsumed = false;
  private llmBlockedByCaptcha = false;
  private servedFromCache = false;
  private capturedError: Error | null = null;
  private fallbackInit?: Omit<
    ConstructorParameters<typeof OpenAI>[0],
    "cache" | "mode"
  >;
  private fallbackClient: OpenAI | null = null;
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
    // Route LLM connections over IPv4 (or ipv4Fetch above).
    openAIInit.additionalSessionOptions = {
      ...(openAIInit.additionalSessionOptions as any),
      fetch: ipv4Fetch as any,
    };
    super(openAIInit);
    this.cache = cache;
    this.mode = mode;
    this.conversationId = conversationId;
    this.requestId = requestId;
    this.enforceCaptcha = enforceCaptcha ?? false;
    if (fallback) {
      this.fallbackInit = {
        ...fallback,
        additionalSessionOptions: {
          ...(fallback.additionalSessionOptions as any),
          fetch: ipv4Fetch as any,
        },
      };
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
    if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED") {
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
    const key = makeCacheKey(messages, options, this.mode);
    const hashedKey = makeHashedKey(key);

    const logger = getLogger();

    /* --- Streaming mode --- */
    if (stream) {
      // Check cache first
      const cached = await this.cache.get(hashedKey);

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

      let rawStream;
      try {
        // Call underlying LLM in streaming mode
        rawStream = await super.chat({
          messages,
          stream: true,
          ...options,
        });
      } catch (err) {
        // On transient failure (429/5xx/timeout), retry on the fallback provider.
        const fallback = this.getFallbackClient();
        if (this.isTransientError(err) && fallback) {
          try {
            rawStream = await fallback.chat({
              messages,
              stream: true,
              ...options,
            });
            console.warn(
              "[CachedOpenAI] Primary provider failed, using fallback provider",
              String((err as Error)?.message || err),
            );
          } catch (fallbackErr) {
            // Both providers failed. Capture the fallback error and end
            // gracefully so the workflow completes instead of hanging.
            this.recordError(fallbackErr);
            return (async function* (): AsyncGenerator<ChatResponseChunk> {})();
          }
        } else {
          // Capture the error and end gracefully so the workflow completes
          // instead of hanging on an unpropagated handler rejection.
          this.recordError(err);
          return (async function* (): AsyncGenerator<ChatResponseChunk> {})();
        }
      }

      // Capture the stream and build a full response object
      const captureStream = async function* (
        this: CachedOpenAI,
      ): AsyncGenerator<ChatResponseChunk> {
        let fullText = "";
        const toolCalls: any[] = [];
        let generationId: string | undefined;
        let lastChunk: ChatResponseChunk | undefined;
        const seenToolCallIds = new Set<string>();

        const STREAM_TIMEOUT_MS =
          Number(process.env.LLM_STREAM_TIMEOUT_MS) || 180_000;
        const iterator = (rawStream as AsyncGenerator<ChatResponseChunk>)[
          Symbol.asyncIterator
        ]();
        let lastChunkTime = Date.now();

        while (true) {
          let result: IteratorResult<ChatResponseChunk>;
          try {
            result = await Promise.race([
              iterator.next(),
              new Promise<never>((_, reject) => {
                const remaining =
                  STREAM_TIMEOUT_MS - (Date.now() - lastChunkTime);
                if (remaining <= 0) {
                  reject(new Error("LLM stream timeout: no chunks received"));
                  return;
                }
                setTimeout(
                  () => reject(new Error("LLM stream timeout")),
                  remaining,
                );
              }),
            ]);
          } catch (err) {
            // Attempt to clean up the iterator, then capture the error and end
            // the stream gracefully (the workflow must complete, not hang).
            try {
              await iterator.return?.(undefined as any);
            } catch {}
            this.recordError(err);
            return;
          }

          if (result.done) break;

          const chunk = result.value;
          lastChunkTime = Date.now();
          fullText += chunk.delta;

          // Collect tool calls if present
          const chunkOptions = chunk.options as any;
          if (chunkOptions?.toolCall) {
            // Handle both single tool call and array of tool calls (flatten nested arrays)
            const calls = Array.isArray(chunkOptions.toolCall)
              ? chunkOptions.toolCall.flat()
              : [chunkOptions.toolCall];

            for (const call of calls) {
              const toolCallId = call.id;
              if (toolCallId) {
                // Overwrite existing entry with latest version (which has fully parsed input)
                const existingIndex = toolCalls.findIndex(
                  (t) => t.id === toolCallId,
                );
                if (existingIndex >= 0) {
                  toolCalls[existingIndex] = call;
                } else {
                  toolCalls.push(call);
                }
                seenToolCallIds.add(toolCallId);
              }
            }
          }

          // Extract generation ID if available
          if (!generationId && chunk.raw && "id" in chunk.raw) {
            generationId = (chunk.raw as any).id;
          }

          lastChunk = chunk;
          yield chunk;
        }
        console.log("TOOLA CALLS: ", JSON.stringify(toolCalls));
        // Build the complete response object
        const response: ChatResponse = {
          message: {
            role: "assistant",
            content: fullText,
            ...(toolCalls.length > 0
              ? { options: { toolCall: toolCalls } }
              : {}),
          },
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

    const key = makeCacheKey(messages, options, this.mode);
    const hashedKey = makeHashedKey(key);

    const logger = getLogger();

    // Check rate limit if specified
    if (
      rateLimit &&
      !(await rateLimiter(rateLimit.userIp, rateLimit.mode)).allowed
    ) {
      throw new Error("Rate limit exceeded");
    }

    /* --- Streaming mode --- */
    if (stream) {
      // Check cache first
      const cached = await this.cache.get(hashedKey);

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
