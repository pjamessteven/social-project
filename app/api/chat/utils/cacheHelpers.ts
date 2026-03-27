import type { UIMessage } from "ai";
import { agentPrompt as researchAgentPrompt } from "../../research/utils/prompts";
import { PostgresCache, makeCacheKey, makeHashedKey } from "../../shared/cache";
import { agentPrompt as chatAgentPrompt } from "./prompts";

/**
 * Transforms UIMessages from the frontend format to the format expected by the cache key
 */
function transformMessagesForCache(
  uiMessages: UIMessage[],
  systemPrompt: string,
): Array<{ role: string; content: string }> {
  // Start with system message (role first to match database format)
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Transform UI messages (content first to match database format)
  for (const msg of uiMessages) {
    const textPart = msg.parts.find((part) => part.type === "text");
    if (textPart && textPart.type === "text") {
      messages.push({
        content: textPart.text,
        role: msg.role,
      });
    }
  }

  return messages;
}

/**
 * Generates a cache key that matches what llm.ts would generate
 */
export function generateChatCacheKey(messages: UIMessage[]): string {
  // Include all messages - the agent workflow adds userInput separately
  // so the cache key should include all messages to match the LLM context
  const transformedMessages = transformMessagesForCache(
    messages,
    chatAgentPrompt,
  );
  const options = { tools: [null, null] };
  const key = makeCacheKey(transformedMessages, options, "detrans_chat");
  return key;
}

/**
 * Generates a cache key that matches what llm.ts would generate for research
 */
export function generateResearchCacheKey(messages: UIMessage[]): string {
  const transformedMessages = transformMessagesForCache(
    messages,
    researchAgentPrompt,
  );
  const options = { tools: [null] };
  return makeCacheKey(transformedMessages, options, "deep_research");
}

/**
 * Checks if there's a cached response for chat
 * Only caches single-turn conversations (no conversationId)
 */
export async function getChatCachedResponse(
  messages: UIMessage[],
  conversationId?: string,
): Promise<string | null> {
  // Disable cache for multi-turn conversations
  if (conversationId) {
    return null;
  }

  const cacheKey = generateChatCacheKey(messages);
  const hashedKey = makeHashedKey(cacheKey);
  const cache = new PostgresCache("detrans_chat");
  return cache.get(hashedKey);
}

/**
 * Checks if there's a cached response for research
 * Research is always single-turn, so we can cache it
 */
export async function getResearchCachedResponse(
  messages: UIMessage[],
): Promise<string | null> {
  const cacheKey = generateResearchCacheKey(messages);
  const hashedKey = makeHashedKey(cacheKey);
  const cache = new PostgresCache("deep_research");
  return cache.get(hashedKey);
}

/**
 * Creates a stream response from cached data
 */
export function createStreamFromCachedResponse(
  cachedResponse: string,
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      try {
        const response = JSON.parse(cachedResponse);
        const content = response.message?.content || response.text || "";

        // Stream the content in chunks to simulate real streaming
        const chunkSize = 10;
        let index = 0;

        const interval = setInterval(() => {
          if (index >= content.length) {
            clearInterval(interval);
            controller.close();
            return;
          }

          const chunk = content.slice(index, index + chunkSize);
          index += chunkSize;

          // Format as Vercel AI SDK data stream
          const data = `0:${JSON.stringify(chunk)}\n`;
          controller.enqueue(encoder.encode(data));
        }, 50);
      } catch (error) {
        console.error("Error streaming cached response:", error);
        controller.error(error);
      }
    },
  });
}
