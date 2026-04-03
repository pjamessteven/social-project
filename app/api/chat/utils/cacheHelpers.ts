import { db, detransQuestions } from "@/db";
import { eq } from "drizzle-orm";
import { agentPrompt as researchAgentPrompt } from "../../research/utils/prompts";
import { PostgresCache, makeCacheKey, makeHashedKey } from "../../shared/cache";
import { agentPrompt as chatAgentPrompt } from "./prompts";

/**
 * Transforms a single message to the format expected by the cache key
 */
function transformMessageForCache(
  message: string,
  systemPrompt: string,
): Array<{ role: string; content: string }> {
  // Return system message and user message
  return [
    { role: "system", content: systemPrompt },
    { content: message, role: "user" },
    { content: message, role: "user" }, // THIS IS INTENTIONAL
  ];
}

/**
 * Generates a cache key that matches what llm.ts would generate
 */
export function generateChatCacheKey(message: string): string {
  // Use single message for cache key
  const transformedMessages = transformMessageForCache(
    message,
    chatAgentPrompt,
  );
  const options = { tools: [null, null] };
  const key = makeCacheKey(transformedMessages, options, "detrans_chat");
  return key;
}

/**
 * Generates a cache key that matches what llm.ts would generate for research
 */
export function generateResearchCacheKey(message: string): string {
  const transformedMessages = transformMessageForCache(
    message,
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
  message: string,
  conversationId?: string,
): Promise<string | null> {
  // Disable cache for multi-turn conversations
  if (conversationId) {
    return null;
  }

  const cacheKey = generateChatCacheKey(message);
  console.log("cache key", cacheKey);
  const hashedKey = makeHashedKey(cacheKey);
  const cache = new PostgresCache("detrans_chat");
  return cache.get(hashedKey);
}

/**
 * Checks if there's a cached response for research
 * Research is always single-turn, so we can cache it
 */
export async function getResearchCachedResponse(
  message: string,
): Promise<string | null> {
  // Check if there's an entry in the detrans_questions table
  const result = await db
    .select({
      name: detransQuestions.name,
      finalResponse: detransQuestions.finalResponse,
    })
    .from(detransQuestions)
    .where(eq(detransQuestions.name, message))
    .limit(1);

  if (!result[0]) {
    return null;
  }

  return result[0].finalResponse;
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
