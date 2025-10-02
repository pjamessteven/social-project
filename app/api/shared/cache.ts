import { rateLimiter } from "@/app/lib/rateLimit";
import { db, detransQuestions, detransCache, affirmQuestions, affirmCache } from "@/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import type {
  ChatResponse,
  ChatResponseChunk,
  LLM,
  LLMChatParamsNonStreaming,
  LLMChatParamsStreaming,
} from "llamaindex";

export class PostgresCache implements Cache {
  constructor(private mode: "detrans" | "affirm") {}

  private getQuestionsTable() {
    return this.mode === "detrans" ? detransQuestions : affirmQuestions;
  }

  private getCacheTable() {
    return this.mode === "detrans" ? detransCache : affirmCache;
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async get(key: string): Promise<string | null> {
    try {
      const hashedKey = this.hashKey(key);
      const cacheTable = this.getCacheTable();
      
      const result = await db
        .select({ resultText: cacheTable.resultText })
        .from(cacheTable)
        .where(eq(cacheTable.promptHash, hashedKey))
        .limit(1);

      if (result.length > 0) {
        // Update last accessed timestamp
        await db
          .update(cacheTable)
          .set({ lastAccessed: new Date() })
          .where(eq(cacheTable.promptHash, hashedKey));
        
        return result[0].resultText;
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, questionName?: string): Promise<void> {
    try {
      const hashedKey = this.hashKey(key);
      const cacheTable = this.getCacheTable();
      
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
    } catch (error) {
      console.error('Cache set error:', error);
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

export class CachedLLM {
  constructor(
    private llm: LLM,
    private cache: Cache,
    private mode: "detrans" | "affirm",
  ) {}

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


    /* --- Streaming mode --- */
    if (stream) {
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


    /* --- Streaming mode --- */
    if (stream) {
      const cached = await this.cache.get(key);
      if (cached) {
        // Replay cached result as a fake stream
        const replayCached = async function* (
          text: string,
        ): AsyncGenerator<{ delta: string }> {
          yield { delta: text };
        };
        console.log("REPLAY CACHED: ", key);
        return replayCached(cached);
      }

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
      console.log("REPLAY CACHED: ", key);
      return { text: cached };
    }

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
