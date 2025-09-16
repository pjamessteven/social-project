import { rateLimiter } from "@/app/lib/rateLimit";
import type {
  ChatResponse,
  ChatResponseChunk,
  LLM,
  LLMChatParamsNonStreaming,
  LLMChatParamsStreaming,
} from "llamaindex";

export class RedisCache implements Cache {
  constructor(
    private client: any,
    private prefix: string,
  ) {}

  private makeRootKey(key: string) {
    return `${this.prefix}:${key}`;
  }

  async get(key: string) {
    return this.client.get(this.makeRootKey(key));
  }

  async set(key: string, value: string) {
    await this.client.set(this.makeRootKey(key), value);
  }

  async increment(key: string) {
    await this.client.incr(this.makeRootKey(key));
  }
}

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
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
}

interface ChatParamsStreaming extends LLMChatParamsStreaming {
  originalQuestion: string;
}

export class CachedLLM {
  constructor(
    private llm: LLM,
    private cache: Cache,
  ) {}

  /* ---------- chat ---------- */
  async chat(
    params: ChatParamsStreaming,
  ): Promise<AsyncGenerator<ChatResponseChunk>>;
  async chat(params: ChatParamsNonStreaming): Promise<ChatResponse>;
  async chat(
    params: ChatParamsStreaming | ChatParamsNonStreaming,
  ): Promise<ChatResponse | AsyncGenerator<ChatResponseChunk>> {
    const { originalQuestion, messages, stream, ...options } = params;
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
        await this.cache.set(key, full);
      }.bind(this);

      return capture();
    }
    const response = await this.llm.chat({ messages, ...options });
    const text = String(response.message.content);
    await this.cache.set(key, text);

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
        await this.cache.set(key, full);
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
    await this.cache.set(key, text);

    return response;
  }
}
