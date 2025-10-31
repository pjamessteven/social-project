import {
  affirmCache,
  db,
  detransCache,
  detransChatCache,
} from "@/db";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";

export interface GenerationMetadata {
  totalCost?: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  model?: string;
  generationId?: string;
}

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, questionName?: string, metadata?: GenerationMetadata): Promise<void>;
}

export class PostgresCache implements Cache {
  constructor(private mode: "detrans" | "affirm" | "detrans_chat") {}

  private getCacheTable() {
    switch (this.mode) {
      case "detrans":
        return detransCache;
      case "affirm":
        return affirmCache;
      case "detrans_chat":
        return detransChatCache;
      default:
        return detransCache;
    }
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

  async set(key: string, value: string, questionName?: string, metadata?: GenerationMetadata): Promise<void> {
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
          totalCost: metadata?.totalCost?.toString() || null,
          tokensPrompt: metadata?.tokensPrompt || null,
          tokensCompletion: metadata?.tokensCompletion || null,
          model: metadata?.model || null,
          generationId: metadata?.generationId || null,
          createdAt: new Date(),
          lastAccessed: new Date(),
        })
        .onConflictDoUpdate({
          target: cacheTable.promptHash,
          set: {
            resultText: value,
            lastAccessed: new Date(),
            ...(metadata && {
              totalCost: metadata.totalCost?.toString() || null,
              tokensPrompt: metadata.tokensPrompt || null,
              tokensCompletion: metadata.tokensCompletion || null,
              model: metadata.model || null,
              generationId: metadata.generationId || null,
            }),
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


export async function fetchOpenRouterGenerationMetadata(generationId: string, apiKey: string): Promise<GenerationMetadata | null> {
  try {
    const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`OpenRouter generation API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    return {
      totalCost: data.total_cost,
      tokensPrompt: data.tokens_prompt,
      tokensCompletion: data.tokens_completion,
      model: data.model,
      generationId: generationId,
    };
  } catch (error) {
    console.error('Error fetching OpenRouter generation metadata:', error);
    return null;
  }
}

export function makeLlmCacheKey(
  question: string,
  prompt: string,
  options: any,
): string {
  return question + ":llm:" + JSON.stringify({ prompt, ...options });
}

import type {
  ChatResponse,
  ChatResponseChunk,
  CompletionResponse,
  LLMChatParamsNonStreaming,
  LLMChatParamsStreaming,
  LLMCompletionParamsNonStreaming,
  LLMCompletionParamsStreaming,
  MessageContent,
} from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import { getLogger } from "@/app/lib/logger";
import { rateLimiter } from "@/app/lib/rateLimit";

interface ChatParamsNonStreaming extends LLMChatParamsNonStreaming {
  originalQuestion?: string;
  mode?: "detrans" | "affirm";
}

interface ChatParamsStreaming extends LLMChatParamsStreaming {
  originalQuestion?: string;
  mode?: "detrans" | "affirm";
}

export class CachedOpenAI extends OpenAI {
  private cache: Cache;
  private mode: "detrans" | "affirm" | "detrans_chat";

  constructor(
    init: ConstructorParameters<typeof OpenAI>[0] & {
      cache: Cache;
      mode: "detrans" | "affirm" | "detrans_chat";
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

  private async extractGenerationMetadata(response: any): Promise<GenerationMetadata | null> {
    try {
      // Extract generation ID from response headers or response object
      const generationId = response?.raw?.headers?.get?.('x-generation-id') || 
                          response?.raw?.id ||
                          response?.id;
      
      if (!generationId || !this.apiKey) {
        return null;
      }

      // Fetch metadata from OpenRouter
      return await fetchOpenRouterGenerationMetadata(generationId, this.apiKey);
    } catch (error) {
      console.error('Error extracting generation metadata:', error);
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
    const questionForCache = originalQuestion || String(lastMessage.content).slice(0, 100);
    // coerce content to string for the cache key
    const key = makeLlmCacheKey(
      questionForCache,
      String(lastMessage.content),
      options,
    );
    const hashedKey = this.hashKey(key);
    const logger = getLogger();

    /* --- Streaming mode --- */
    if (stream) {
      logger.info({
        originalQuestion: questionForCache,
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
        const metadata = await this.extractGenerationMetadata(rawStream);
        await this.cache.set(key, full, questionForCache, metadata);
      }.bind(this);

      return capture();
    }

    /* --- Non-streaming mode --- */
    const cached = await this.cache.get(key);
    if (cached) {
      logger.info({
        originalQuestion: questionForCache,
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
    const metadata = await this.extractGenerationMetadata(response);
    await this.cache.set(key, text, questionForCache, metadata);

    logger.info({
      originalQuestion: questionForCache,
      hashedKey,
      mode: this.mode,
      type: 'chat'
    }, 'LLM cache generating new');

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
    }
  ): Promise<CompletionResponse>;
  async complete(
    params: LLMCompletionParamsStreaming & {
      originalQuestion?: string;
      rateLimit?: {
        userIp: string;
        mode: string;
      };
    }
  ): Promise<AsyncIterable<CompletionResponse>>;
  async complete(
    params: (LLMCompletionParamsStreaming | LLMCompletionParamsNonStreaming) & {
      originalQuestion?: string;
      rateLimit?: {
        userIp: string;
        mode: string;
      };
    }
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
    const promptString = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const questionForCache = originalQuestion || promptString.slice(0, 100);
    const key = makeLlmCacheKey(questionForCache, promptString, options);
    const hashedKey = this.hashKey(key);
    const logger = getLogger();

    /* --- Streaming mode --- */
    if (stream) {
      const cached = await this.cache.get(key);
      if (cached) {
        logger.info({
          originalQuestion: questionForCache,
          hashedKey,
          mode: this.mode,
          type: 'complete_streaming'
        }, 'LLM cache hit (streaming)');

        // Replay cached result as a fake stream
        const replayCached = async function* (
          text: string,
        ): AsyncIterable<CompletionResponse> {
          yield { text, raw: null } as CompletionResponse;
        };
        return replayCached(cached);
      }

      logger.info({
        originalQuestion: questionForCache,
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
      ): AsyncIterable<CompletionResponse> {
        let full = "";
        for await (const chunk of rawStream as AsyncIterable<CompletionResponse>) {
          full += chunk.text || "";
          yield chunk;
        }
        const metadata = await this.extractGenerationMetadata(rawStream);
        await this.cache.set(key, full, questionForCache, metadata);
      }.bind(this);

      return capture();
    }

    /* --- Non-streaming mode --- */
    const cached = await this.cache.get(key);
    if (cached) {
      logger.info({
        originalQuestion: questionForCache,
        hashedKey,
        mode: this.mode,
        type: 'complete'
      }, 'LLM cache hit');
      return { text: cached, raw: null } as CompletionResponse;
    }

    logger.info({
      originalQuestion: questionForCache,
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
    const metadata = await this.extractGenerationMetadata(response);
    await this.cache.set(key, text, questionForCache, metadata);

    return response;
  }
}


