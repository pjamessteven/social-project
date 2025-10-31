import { rateLimiter } from "@/app/lib/rateLimit";
import {
  affirmCache,
  affirmQuestions,
  db,
  detransCache,
  detransQuestions,
} from "@/db";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import type {
  ChatResponse,
  ChatResponseChunk,
  LLM,
  LLMChatParamsNonStreaming,
  LLMChatParamsStreaming,
} from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import { getLogger } from "@/app/lib/logger";

export class PostgresCache implements Cache {
  constructor(private mode: "detrans" | "affirm") {}

  private getCacheTable() {
    return this.mode === "detrans" ? detransCache : affirmCache;
  }

  private hashKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
  }

  async get(key: string): Promise<string | null> {
    const startTime = Date.now();
    try {
      const hashStartTime = Date.now();
      const hashedKey = this.hashKey(key);
      const hashTime = Date.now() - hashStartTime;
      
      const cacheTable = this.getCacheTable();

      const queryStartTime = Date.now();
      const result = await db
        .select({ resultText: cacheTable.resultText })
        .from(cacheTable)
        .where(eq(cacheTable.promptHash, hashedKey))
        .limit(1);
      const queryTime = Date.now() - queryStartTime;

      if (result.length > 0) {
        const updateStartTime = Date.now();
        // Update last accessed timestamp
        await db
          .update(cacheTable)
          .set({ lastAccessed: new Date() })
          .where(eq(cacheTable.promptHash, hashedKey));
        const updateTime = Date.now() - updateStartTime;
        const totalTime = Date.now() - startTime;


        return result[0].resultText;
      }

      const totalTime = Date.now() - startTime;

      return null;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error("Cache get error:", error);
      return null;
    }
  }

  async set(key: string, value: string, questionName?: string): Promise<void> {
    const startTime = Date.now();
    try {
      const hashStartTime = Date.now();
      const hashedKey = this.hashKey(key);
      const hashTime = Date.now() - hashStartTime;
      
      const cacheTable = this.getCacheTable();

      const insertStartTime = Date.now();
      await db
        .insert(cacheTable)
        .values({
          promptHash: hashedKey,
          promptText: key,
          resultText: value,
          questionName: questionName || null,
          createdAt: new Date(),
          lastAccessed: new Date(),
        })
        .onConflictDoUpdate({
          target: cacheTable.promptHash,
          set: {
            resultText: value,
            lastAccessed: new Date(),
          },
        });
      const insertTime = Date.now() - insertStartTime;
      const totalTime = Date.now() - startTime;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error("Cache set error:", error);
      // Don't throw - cache failures shouldn't break the application
    }
  }
}

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, questionName?: string): Promise<void>;
}

function makeLlmCacheKey(
  question: string,
  prompt: string,
  options: any,
): string {
  return question + ":llm:" + JSON.stringify({ prompt, ...options });
}
interface ChatParamsNonStreaming extends LLMChatParamsNonStreaming {
  originalQuestion: string;
  mode?: "detrans" | "affirm";
}

interface ChatParamsStreaming extends LLMChatParamsStreaming {
  originalQuestion: string;
  mode?: "detrans" | "affirm";
}

export class CachedOpenAI extends OpenAI {
  private cache: Cache;
  private mode: "detrans" | "affirm";

  constructor(
    init: ConstructorParameters<typeof OpenAI>[0] & {
      cache: Cache;
      mode: "detrans" | "affirm";
    }
  ) {
    const { cache, mode, ...openAIInit } = init;
    super(openAIInit);
    this.cache = cache;
    this.mode = mode;
  }

  private hashKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
  }

  /* ---------- chat ---------- */
  async chat(
    params: LLMChatParamsStreaming & { originalQuestion: string },
  ): Promise<AsyncGenerator<ChatResponseChunk>>;
  async chat(
    params: LLMChatParamsNonStreaming & { originalQuestion: string },
  ): Promise<ChatResponse>;
  async chat(
    params: (LLMChatParamsStreaming | LLMChatParamsNonStreaming) & {
      originalQuestion: string;
    },
  ): Promise<ChatResponse | AsyncGenerator<ChatResponseChunk>> {
    const { originalQuestion, messages, stream, ...options } = params;
    const lastMessage = messages[messages.length - 1];
    // coerce content to string for the cache key
    const key = makeLlmCacheKey(
      originalQuestion,
      String(lastMessage.content),
      options,
    );
    const hashedKey = this.hashKey(key);
    const logger = getLogger();

    /* --- Streaming mode --- */
    if (stream) {
      logger.info({
        originalQuestion,
        hashedKey,
        mode: this.mode,
        type: 'chat_streaming'
      }, 'LLM cache generating new (streaming)');

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
        for await (const chunk of rawStream as AsyncGenerator<ChatResponseChunk>) {
          full += chunk.delta;
          yield chunk;
        }
        await this.cache.set(key, full, originalQuestion);
      }.bind(this);

      return capture();
    }

    /* --- Non-streaming mode --- */
    const cached = await this.cache.get(key);
    if (cached) {
      logger.info({
        originalQuestion,
        hashedKey,
        mode: this.mode,
        type: 'chat'
      }, 'LLM cache hit');
      
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
    await this.cache.set(key, text, originalQuestion);

    logger.info({
      originalQuestion,
      hashedKey,
      mode: this.mode,
      type: 'chat'
    }, 'LLM cache generating new');

    return response;
  }

  /* ---------- complete ---------- */
  async complete(params: {
    originalQuestion: string;
    prompt: string;
    responseFormat?: object;
    stream?: false;
    rateLimit?: {
      userIp: string;
      mode: string;
    };
    [key: string]: any;
  }): Promise<{ text: string }>;
  async complete(params: {
    originalQuestion: string;
    prompt: string;
    responseFormat?: object;
    stream: true;
    rateLimit?: {
      userIp: string;
      mode: string;
    };
    [key: string]: any;
  }): Promise<AsyncGenerator<{ delta: string }>>;
  async complete(params: {
    originalQuestion: string;
    prompt: string;
    responseFormat?: object;
    stream?: boolean;
    rateLimit?: {
      userIp: string;
      mode: string;
    };
    [key: string]: any;
  }): Promise<{ text: string } | AsyncGenerator<{ delta: string }>> {
    const {
      prompt,
      originalQuestion,
      responseFormat,
      stream,
      rateLimit,
      ...options
    } = params;
    const key = makeLlmCacheKey(originalQuestion, prompt, options);
    const hashedKey = this.hashKey(key);
    const logger = getLogger();

    /* --- Streaming mode --- */
    if (stream) {
      const cached = await this.cache.get(key);
      if (cached) {
        logger.info({
          originalQuestion,
          hashedKey,
          mode: this.mode,
          type: 'complete_streaming'
        }, 'LLM cache hit (streaming)');

        // Replay cached result as a fake stream
        const replayCached = async function* (
          text: string,
        ): AsyncGenerator<{ delta: string }> {
          yield { delta: text };
        };
        return replayCached(cached);
      }

      logger.info({
        originalQuestion,
        hashedKey,
        mode: this.mode,
        type: 'complete_streaming'
      }, 'LLM cache miss, generating new (streaming)');

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
      ): AsyncGenerator<{ delta: string }> {
        let full = "";
        for await (const chunk of rawStream as AsyncGenerator<{
          delta: string;
        }>) {
          full += chunk.delta;
          yield chunk;
        }
        await this.cache.set(key, full, originalQuestion);
      }.bind(this);

      return capture();
    }

    /* --- Non-streaming mode --- */
    const cached = await this.cache.get(key);
    if (cached) {
      logger.info({
        originalQuestion,
        hashedKey,
        mode: this.mode,
        type: 'complete'
      }, 'LLM cache hit');
      return { text: cached };
    }

    logger.info({
      originalQuestion,
      hashedKey,
      mode: this.mode,
      type: 'complete'
    }, 'LLM cache miss, generating new');

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
    await this.cache.set(key, text, originalQuestion);

    return response;
  }
}
