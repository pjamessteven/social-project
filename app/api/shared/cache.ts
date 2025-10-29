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
  ToolCallLLM,
} from "llamaindex";
import { getLogger } from "@/app/lib/logger";

export class PostgresCache implements Cache {
  constructor(private mode: "detrans" | "affirm") {}

  private getQuestionsTable() {
    return this.mode === "detrans" ? detransQuestions : affirmQuestions;
  }

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

export class CachedLLM implements ToolCallLLM {
  constructor(
    private llm: LLM & ToolCallLLM,
    private cache: Cache,
    private mode: "detrans" | "affirm",
  ) {}

  // Add the missing ToolCallLLM properties
  get supportToolCall() {
    return (this.llm as ToolCallLLM).supportToolCall;
  }

  get metadata() {
    return this.llm.metadata;
  }

  // Implement the missing methods
  async exec(params: any) {
    return (this.llm as ToolCallLLM).exec(params);
  }

  async streamExec(params: any) {
    return (this.llm as ToolCallLLM).streamExec(params);
  }

  /* ---------- chat ---------- */
  async chat(
    params: ChatParamsStreaming,
  ): Promise<AsyncGenerator<ChatResponseChunk>>;
  async chat(params: ChatParamsNonStreaming): Promise<ChatResponse>;
  async chat(
    params: ChatParamsStreaming | ChatParamsNonStreaming,
  ): Promise<ChatResponse | AsyncGenerator<ChatResponseChunk>> {
    const { originalQuestion, messages, stream, mode, ...options } = params;
    const lastMessage = messages[messages.length - 1];
    // coerce content to string for the cache key
    const key = makeLlmCacheKey(
      originalQuestion,
      String(lastMessage.content),
      options,
    );
    const hashedKey = this.cache instanceof PostgresCache ? 
      (this.cache as any).hashKey(key) : createHash("sha256").update(key).digest("hex");
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
      const rawStream = await this.llm.chat({
        messages,
        stream: true,
        ...options,
      });

      const capture = async function* (
        this: CachedLLM,
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
    const response = await this.llm.chat({ messages, ...options });
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
    responseFormat?: object; // <- allow object/ZodType or omit
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
    responseFormat?: object; // <- allow object/ZodType or omit
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
    responseFormat?: object; // <- allow object/ZodType or omit
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

    const hashedKey = this.cache instanceof PostgresCache ? 
      (this.cache as any).hashKey(key) : createHash("sha256").update(key).digest("hex");
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
      const rawStream = await this.llm.complete({
        prompt,
        responseFormat,
        stream: true,
        ...options,
      });

      const capture = async function* (
        this: CachedLLM,
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

    const response = await this.llm.complete({
      prompt,
      responseFormat,
      ...options,
    });
    const text = String(response.text);
    await this.cache.set(key, text, originalQuestion);

    return response;
  }
}
