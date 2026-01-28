import { rateLimiter } from "@/app/lib/rateLimit";

import { getLogger } from "@/app/lib/logger";
import { replayCached } from "@/app/lib/replayCached";
import { OpenAI } from "@llamaindex/openai";
import { createHash } from "crypto";
import type {
  ChatResponse,
  ChatResponseChunk,
  CompletionResponse,
  LLMChatParamsNonStreaming,
  LLMChatParamsStreaming,
  LLMCompletionParamsNonStreaming,
  LLMCompletionParamsStreaming,
} from "llamaindex";
import { Cache, makeLlmCacheKey } from "./cache";

export class CachedOpenAI extends OpenAI {
  private cache: Cache;
  private mode: "detrans" | "affirm" | "detrans_chat";
  private conversationId: string | undefined;

  constructor(
    init: ConstructorParameters<typeof OpenAI>[0] & {
      cache: Cache;
      mode: "detrans" | "affirm" | "detrans_chat";
      conversationId?: string;
    },
  ) {
    const { cache, mode, conversationId, ...openAIInit } = init;
    super(openAIInit);
    this.cache = cache;
    this.mode = mode;
    this.conversationId = conversationId;
  }

  private hashKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
  }

  private async fetchGenerationMetadata(generationId: string): Promise<{
    totalCost?: number;
    tokensPrompt?: number;
    tokensCompletion?: number;
    model?: string;
  } | null> {
    // wait a sec
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
    params: LLMChatParamsStreaming & { originalQuestion?: string },
  ): Promise<AsyncGenerator<ChatResponseChunk>>;
  async chat(
    params: LLMChatParamsNonStreaming & { originalQuestion?: string },
  ): Promise<ChatResponse>;
  async chat(
    params: (LLMChatParamsStreaming | LLMChatParamsNonStreaming) & {
      originalQuestion?: string;
    },
  ): Promise<ChatResponse | AsyncGenerator<ChatResponseChunk>> {
    const { originalQuestion, messages, stream, ...options } = params;
    const lastMessage = messages[messages.length - 1];
    console.log("KIMI TEST", messages);
    const questionForCache =
      originalQuestion || String(lastMessage.content).slice(0, 100);
    // Pass entire messages array for context-aware caching
    const key = makeLlmCacheKey(questionForCache, messages, options, this.mode);

    const hashedKey = this.hashKey(key);
    const logger = getLogger();

    /* --- Streaming mode --- */
    if (stream) {
      console.log("Checking cache for streaming request...");
      const cached = await this.cache.get(key);
      console.log("Cache result:", cached ? "HIT" : "MISS");
      if (cached) {
        console.log("Cache hit - content length:", cached.length);
        logger.info(
          {
            originalQuestion: questionForCache,
            hashedKey,
            mode: this.mode,
            type: "chat_streaming",
            contentLength: cached.length,
          },
          "LLM cache hit (streaming)",
        );

        // Parse cached response which may include tool calls
        let cachedData: { text: string; toolCalls?: any[] };
        try {
          cachedData = JSON.parse(cached);
        } catch (e) {
          // Fallback to plain text for backward compatibility
          cachedData = { text: cached };
        }

        // Replay cached result as a fake stream using replayCached
        const replayCachedStream = async function* (data: {
          text: string;
          toolCalls?: any[];
        }): AsyncGenerator<ChatResponseChunk> {
          // If there are tool calls, yield them first
          if (data.toolCalls && data.toolCalls.length > 0) {
            yield {
              delta: "",
              raw: null,
              options: { toolCall: data.toolCalls } as object,
            } as ChatResponseChunk;
          }
          // Yield the text content using replayCached
          for await (const chunk of replayCached(data.text)) {
            yield {
              ...chunk,
              options: (data.toolCalls && data.toolCalls.length > 0
                ? { toolCall: data.toolCalls }
                : {}) as object,
            } as ChatResponseChunk;
          }
        };
        return replayCachedStream(cachedData);
      }

      console.log("Cache miss - generating new response");
      logger.info(
        {
          hashedKey,
          type: "chat_streaming",
        },
        "LLM cache miss, generating new (streaming)",
      );

      // Call underlying LLM in streaming mode
      const rawStream = await super.chat({
        messages,
        stream: true,
        ...options,
      });

      const capture = async function* (
        this: CachedOpenAI,
      ): AsyncGenerator<ChatResponseChunk> {
        let full = "";
        let toolCalls: any[] = [];
        let generationId: string | undefined;
        for await (const chunk of rawStream as AsyncGenerator<ChatResponseChunk>) {
          full += chunk.delta;
          // Collect tool calls if present - they might be on the options object
          // Since options is typed as object, we need to cast it to access toolCall
          const options = chunk.options as any;
          if (options?.toolCall) {
            toolCalls = options.toolCall;
          }

          // Extract generation ID from the first chunk if available
          if (!generationId && chunk.raw && "id" in chunk.raw) {
            generationId = (chunk.raw as any).id;
          }
          yield chunk;
        }

        // Prepare data to cache (include both text and tool calls)
        const dataToCache =
          toolCalls.length > 0
            ? JSON.stringify({ text: full, toolCalls })
            : full;

        // Fetch metadata if we have a generation ID
        let metadata;
        if (generationId) {
          metadata = (await this.fetchGenerationMetadata(generationId)) as any;
          if (!metadata) {
            metadata = {};
          }
          metadata.generationId = generationId;
          metadata.conversationId = this.conversationId;
        }

        // If metadata doesn't exist yet, create it
        if (!metadata) {
          metadata = {};
        }
        // For streaming responses, we may not have usage information readily available
        // The fetchGenerationMetadata should handle this
        console.log("Setting cache with metadata (streaming):", metadata);
        await this.cache.set(key, dataToCache, questionForCache, metadata);
      }.bind(this);

      return capture();
    }

    /* --- Non-streaming mode --- */
    console.log("Checking cache for non-streaming request...");
    const cached = await this.cache.get(key);
    console.log("Cache result:", cached ? "HIT" : "MISS");
    if (cached) {
      console.log("Cache hit - content length:", cached.length);
      logger.info(
        {
          originalQuestion: questionForCache,
          hashedKey,
          mode: this.mode,
          type: "chat",
          contentLength: cached.length,
        },
        "LLM cache hit",
      );

      // Parse cached response which may include tool calls
      let text: string;
      let toolCalls: any[] | undefined;
      try {
        const cachedData = JSON.parse(cached);
        text = cachedData.text;
        toolCalls = cachedData.toolCalls;
      } catch (e) {
        // Fallback to plain text for backward compatibility
        text = cached;
        toolCalls = undefined;
      }

      // Return a ChatResponse-like object with the cached content
      // For non-streaming responses, tool calls should be on the message
      const message: any = {
        role: "assistant",
        content: text,
      };
      if (toolCalls) {
        message.toolCalls = toolCalls;
      }
      return {
        message,
        raw: null,
      } as ChatResponse;
    }

    const response = await super.chat({ messages, ...options });
    const text = String(response.message.content);

    // Check if the message has tool calls
    // In llamaindex, tool calls might be on the message itself
    const toolCalls = (response.message as any).toolCalls;

    // Prepare data to cache (include both text and tool calls)
    const dataToCache =
      toolCalls && toolCalls.length > 0
        ? JSON.stringify({ text, toolCalls })
        : text;

    // Fetch metadata if we have a generation ID
    let metadata;
    if (response.raw && "id" in response.raw) {
      metadata = (await this.fetchGenerationMetadata(
        (response.raw as any).id,
      )) as any;
      if (!metadata) {
        metadata = {};
      }
      metadata.generationId = (response.raw as any).id;
      metadata.conversationId = this.conversationId;
      console.log("CHAT 180 generation ID", metadata.generationId);
    }

    // If metadata doesn't exist yet, create it
    if (!metadata) {
      metadata = {};
    }
    // Ensure token counts are always included if available in the response
    if (response.raw && "usage" in response.raw) {
      const usage = (response.raw as any).usage;
      if (usage) {
        metadata.tokensPrompt = usage.prompt_tokens;
        metadata.tokensCompletion = usage.completion_tokens;
      }
    }
    console.log("Setting cache with metadata:", metadata);
    await this.cache.set(key, dataToCache, questionForCache, metadata);

    console.log("Cache miss - generating new response");
    logger.info(
      {
        originalQuestion: questionForCache,
        hashedKey,
        mode: this.mode,
        type: "chat",
        cacheKey: key,
      },
      "LLM cache generating new",
    );

    return response;
  }

  /* ---------- complete ---------- */
  async complete(
    params: LLMCompletionParamsNonStreaming & {
      originalQuestion?: string;
      rateLimit?: {
        userIp: string;
        mode: string;
      };
    },
  ): Promise<CompletionResponse>;
  async complete(
    params: LLMCompletionParamsStreaming & {
      originalQuestion?: string;
      rateLimit?: {
        userIp: string;
        mode: string;
      };
    },
  ): Promise<AsyncIterable<CompletionResponse>>;
  async complete(
    params: (LLMCompletionParamsStreaming | LLMCompletionParamsNonStreaming) & {
      originalQuestion?: string;
      rateLimit?: {
        userIp: string;
        mode: string;
      };
    },
  ): Promise<CompletionResponse | AsyncIterable<CompletionResponse>> {
    const {
      prompt,
      originalQuestion,
      responseFormat,
      stream,
      rateLimit,
      ...options
    } = params;

    // Convert MessageContent to string for caching
    const promptString =
      typeof prompt === "string" ? prompt : JSON.stringify(prompt);
    const questionForCache = originalQuestion || promptString.slice(0, 100);
    // For completion, we don't have messages, so use the prompt directly
    // Convert to a messages-like structure for consistency
    const messages = [{ role: "user", content: promptString }];
    const key = makeLlmCacheKey(questionForCache, messages, options, this.mode);
    const hashedKey = this.hashKey(key);
    const logger = getLogger();

    /* --- Streaming mode --- */
    if (stream) {
      console.log("Checking cache for complete streaming request...");
      const cached = await this.cache.get(key);
      console.log("Cache result:", cached ? "HIT" : "MISS");
      if (cached) {
        console.log("Cache hit - content length:", cached.length);
        logger.info(
          {
            originalQuestion: questionForCache,
            hashedKey,
            mode: this.mode,
            type: "complete_streaming",
            contentLength: cached.length,
          },
          "LLM cache hit (streaming)",
        );

        // Replay cached result as a fake stream using replayCached
        const replayCachedStream = async function* (
          text: string,
        ): AsyncIterable<CompletionResponse> {
          for await (const chunk of replayCached(text)) {
            yield {
              text: chunk.delta,
              raw: null,
            } as CompletionResponse;
          }
        };
        return replayCachedStream(cached);
      }

      console.log("Cache miss - generating new completion");
      logger.info(
        {
          hashedKey,
          type: "complete_streaming",
        },
        "LLM cache miss, generating new (streaming)",
      );

      if (
        rateLimit &&
        !(await rateLimiter(rateLimit.userIp, rateLimit.mode)).allowed
      ) {
        throw new Error("Rate limit exceeded");
      }

      // Call underlying LLM in streaming mode
      const rawStream = await super.complete({
        prompt,
        responseFormat,
        stream: true,
        ...options,
      });

      const capture = async function* (
        this: CachedOpenAI,
      ): AsyncIterable<CompletionResponse> {
        let full = "";
        let generationId: string | undefined;
        for await (const chunk of rawStream as AsyncIterable<CompletionResponse>) {
          full += chunk.text || "";
          // Extract generation ID from the first chunk if available
          if (!generationId && chunk.raw && "id" in chunk.raw) {
            generationId = (chunk.raw as any).id;
          }

          yield chunk;
        }

        // Fetch metadata if we have a generation ID
        let metadata;
        if (generationId) {
          metadata = (await this.fetchGenerationMetadata(generationId)) as any;
          if (!metadata) {
            metadata = {};
          }
          metadata.generationId = generationId;
          metadata.conversationId = this.conversationId;
        }

        // If metadata doesn't exist yet, create it
        if (!metadata) {
          metadata = {};
        }
        console.log(
          "Setting cache with metadata (completion streaming):",
          metadata,
        );
        await this.cache.set(key, full, questionForCache, metadata);
      }.bind(this);

      return capture();
    }

    /* --- Non-streaming mode --- */
    console.log("Checking cache for complete non-streaming request...");
    const cached = await this.cache.get(key);
    console.log("Cache result:", cached ? "HIT" : "MISS");
    if (cached) {
      console.log("Cache hit - content length:", cached.length);
      logger.info(
        {
          originalQuestion: questionForCache,
          hashedKey,
          mode: this.mode,
          type: "complete",
          contentLength: cached.length,
        },
        "LLM cache hit",
      );
      return { text: cached, raw: null } as CompletionResponse;
    }

    console.log("Cache miss - generating new completion");
    logger.info(
      {
        hashedKey,
        type: "complete",
      },
      "LLM cache miss, generating new",
    );

    if (
      rateLimit &&
      !(await rateLimiter(rateLimit.userIp, rateLimit.mode)).allowed
    ) {
      throw new Error("Rate limit exceeded");
    }

    const response = await super.complete({
      prompt,
      responseFormat,
      ...options,
    });
    const text = String(response.text);

    // Fetch metadata if we have a generation ID
    let metadata;
    if (response.raw && "id" in response.raw) {
      metadata = (await this.fetchGenerationMetadata(
        (response.raw as any).id,
      )) as any;
      if (!metadata) {
        metadata = {};
      }
      metadata.generationId = (response.raw as any).id;
      metadata.conversationId = this.conversationId;
    }

    // If metadata doesn't exist yet, create it
    if (!metadata) {
      metadata = {};
    }
    // Ensure token counts are always included if available in the response
    if (response.raw && "usage" in response.raw) {
      const usage = (response.raw as any).usage;
      if (usage) {
        metadata.tokensPrompt = usage.prompt_tokens;
        metadata.tokensCompletion = usage.completion_tokens;
      }
    }
    console.log("Setting cache with metadata (completion):", metadata);
    await this.cache.set(key, text, questionForCache, metadata);

    return response;
  }
}
