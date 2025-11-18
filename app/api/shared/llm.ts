import { rateLimiter } from "@/app/lib/rateLimit";

import { getLogger } from "@/app/lib/logger";
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
    try {
      const response = await fetch(
        `https://openrouter.ai/api/v1/generation?id=${generationId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        console.warn(`Failed to fetch generation metadata: ${response.status}`);
        return null;
      }
      console.log("OPENROUTER RESP", JSON.stringify(response));
      const data = await response.json();
      return {
        totalCost: data.total_cost,
        tokensPrompt: data.usage?.prompt_tokens,
        tokensCompletion: data.usage?.completion_tokens,
        model: data.model,
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
    const questionForCache =
      originalQuestion || String(lastMessage.content).slice(0, 100);
    // coerce content to string for the cache key
    const key = makeLlmCacheKey(
      questionForCache,
      String(lastMessage.content),
      options,
      this.mode,
    );
    console.log("CACHE KEY:", key);
    console.log("Cache key length:", key.length);
    console.log("Mode:", this.mode);
    console.log("Question for cache:", questionForCache);

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
            cacheKey: key,
            contentLength: cached.length,
          },
          "LLM cache hit (streaming)",
        );

        // Replay cached result as a fake stream
        const replayCached = async function* (
          text: string,
        ): AsyncGenerator<ChatResponseChunk> {
          yield { delta: text, raw: null } as ChatResponseChunk;
        };
        return replayCached(cached);
      }

      console.log("Cache miss - generating new response");
      logger.info(
        {
          originalQuestion: questionForCache,
          hashedKey,
          mode: this.mode,
          type: "chat_streaming",
          cacheKey: key,
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
        let generationId: string | undefined;
        for await (const chunk of rawStream as AsyncGenerator<ChatResponseChunk>) {
          full += chunk.delta;
          console.log("CHUNK", JSON.stringify(chunk));
          // Extract generation ID from the first chunk if available
          if (!generationId && chunk.raw && 'id' in chunk.raw) {
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

        await this.cache.set(key, full, questionForCache, metadata);
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
          cacheKey: key,
          contentLength: cached.length,
        },
        "LLM cache hit",
      );

      // Return a ChatResponse-like object with the cached content
      return {
        message: {
          role: "assistant",
          content: cached,
        },
        raw: null,
      } as ChatResponse;
    }

    const response = await super.chat({ messages, ...options });
    const text = String(response.message.content);

    // Fetch metadata if we have a generation ID
    let metadata;
    if (response.raw && 'id' in response.raw) {
      metadata = (await this.fetchGenerationMetadata((response.raw as any).id)) as any;
      if (!metadata) {
        metadata = {};
      }
      metadata.generationId = (response.raw as any).id;
      metadata.conversationId = this.conversationId
      console.log("CHAT 180 generation ID", metadata.generationId);
    }

    await this.cache.set(key, text, questionForCache, metadata);

    logger.info(
      {
        originalQuestion: questionForCache,
        hashedKey,
        mode: this.mode,
        type: "chat",
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
    const key = makeLlmCacheKey(
      questionForCache,
      promptString,
      options,
      this.mode,
    );
    console.log("CACHE KEY", key)
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
            cacheKey: key,
            contentLength: cached.length,
          },
          "LLM cache hit (streaming)",
        );

        // Replay cached result as a fake stream
        const replayCached = async function* (
          text: string,
        ): AsyncIterable<CompletionResponse> {
          yield { text, raw: null } as CompletionResponse;
        };
        return replayCached(cached);
      }

      console.log("Cache miss - generating new completion");
      logger.info(
        {
          originalQuestion: questionForCache,
          hashedKey,
          mode: this.mode,
          type: "complete_streaming",
          cacheKey: key,
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
          if (!generationId && chunk.raw && 'id' in chunk.raw) {
            generationId = (chunk.raw as any).id;
          }

          yield chunk;
        }

        // Fetch metadata if we have a generation ID
        let metadata;
        if (generationId) {
          metadata = (await this.fetchGenerationMetadata(generationId)) as any;
          if (!metadata) {
            metadata = {}
          }
            metadata.generationId = generationId;
          metadata.conversationId = this.conversationId;
        }

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
          cacheKey: key,
          contentLength: cached.length,
        },
        "LLM cache hit",
      );
      return { text: cached, raw: null } as CompletionResponse;
    }

    console.log("Cache miss - generating new completion");
    logger.info(
      {
        originalQuestion: questionForCache,
        hashedKey,
        mode: this.mode,
        type: "complete",
        cacheKey: key,
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
    if (response.raw && 'id' in response.raw) {
      metadata = (await this.fetchGenerationMetadata((response.raw as any).id)) as any;
      if (!metadata) {
        metadata = {}
      }
      metadata.generationId = (response.raw as any).id;
      console.log("COMPLETE metadata355", metadata);
      metadata.conversationId = this.conversationId;
    }

    await this.cache.set(key, text, questionForCache, metadata);

    return response;
  }
}
