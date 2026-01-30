import { getLogger } from "@/app/lib/logger";
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

export class CachedOpenAI extends OpenAI {
  private cache: Cache;
  private mode: "detrans_chat" | "deep_research";
  private conversationId: string | undefined;

  constructor(
    init: ConstructorParameters<typeof OpenAI>[0] & {
      cache: Cache;
      mode: "detrans_chat" | "deep_research";
      conversationId?: string;
    },
  ) {
    const { cache, mode, conversationId, ...openAIInit } = init;
    super(openAIInit);
    this.cache = cache;
    this.mode = mode;
    this.conversationId = conversationId;
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

        // Parse the cached full response object
        const cachedResponse = JSON.parse(cached) as ChatResponse;
        const content = cachedResponse.message?.content;
        const text =
          typeof content === "string" ? content : JSON.stringify(content);

        // Replay the cached text as a stream
        const replayStream =
          async function* (): AsyncGenerator<ChatResponseChunk> {
            for await (const chunk of replayCached(text)) {
              yield {
                ...chunk,
                options: cachedResponse.message?.options || {},
              } as ChatResponseChunk;
            }
          };

        return replayStream();
      }

      logger.info(
        { hashedKey, type: "chat_streaming" },
        "LLM cache miss, generating new (streaming)",
      );

      // Call underlying LLM in streaming mode
      const rawStream = await super.chat({
        messages,
        stream: true,
        ...options,
      });

      // Capture the stream and build a full response object
      const captureStream = async function* (
        this: CachedOpenAI,
      ): AsyncGenerator<ChatResponseChunk> {
        let fullText = "";
        const toolCalls: any[] = [];
        let generationId: string | undefined;
        let lastChunk: ChatResponseChunk | undefined;
        const seenToolCallIds = new Set<string>();

        for await (const chunk of rawStream as AsyncGenerator<ChatResponseChunk>) {
          fullText += chunk.delta;

          // Collect tool calls if present
          const chunkOptions = chunk.options as any;
          if (chunkOptions?.toolCall) {
            // Handle both single tool call and array of tool calls (flatten nested arrays)
            const calls = Array.isArray(chunkOptions.toolCall)
              ? chunkOptions.toolCall.flat()
              : [chunkOptions.toolCall];

            for (const call of calls) {
              // Check if we've already seen this tool call ID to avoid duplicates
              const toolCallId = call.id;
              if (toolCallId && !seenToolCallIds.has(toolCallId)) {
                seenToolCallIds.add(toolCallId);
                toolCalls.push(call);
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

      // Return the cached full response object
      return JSON.parse(cached) as ChatResponse;
    }

    // Generate new response
    const response = await super.chat({ messages, ...options });

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
      const rawStream = await super.complete({
        prompt,
        responseFormat,
        stream: true,
        ...options,
      });

      // Capture the stream and build a full response object
      const captureStream = async function* (
        this: CachedOpenAI,
      ): AsyncIterable<CompletionResponse> {
        let fullText = "";
        let generationId: string | undefined;
        let lastChunk: CompletionResponse | undefined;

        for await (const chunk of rawStream as AsyncIterable<CompletionResponse>) {
          fullText += chunk.text || "";

          // Extract generation ID if available
          if (!generationId && chunk.raw && "id" in chunk.raw) {
            generationId = (chunk.raw as any).id;
          }

          lastChunk = chunk;
          yield chunk;
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
    const response = await super.complete({
      prompt,
      responseFormat,
      ...options,
    });

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
  }> {
    const metadata: any = {};

    // Add generation ID if available
    if (generationId) {
      metadata.generationId = generationId;
      metadata.conversationId = this.conversationId;

      // Fetch metadata from OpenRouter
      const generationMetadata =
        await this.fetchGenerationMetadata(generationId);
      if (generationMetadata) {
        Object.assign(metadata, generationMetadata);
      }
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
