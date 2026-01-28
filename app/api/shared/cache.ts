import { db, detransCache, detransChatCache } from "@/db";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
export interface Cache {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    questionName?: string,
    metadata?: {
      totalCost?: number;
      tokensPrompt?: number;
      tokensCompletion?: number;
      model?: string;
      generationId?: string;
      conversationId?: string;
    },
  ): Promise<void>;
}

export class PostgresCache implements Cache {
  constructor(private mode: "detrans" | "affirm" | "detrans_chat") {}

  private getCacheTable() {
    if (this.mode === "detrans_chat") return detransChatCache;
    return detransCache;
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

  async set(
    key: string,
    value: string,
    questionName?: string,
    metadata?: {
      totalCost?: number;
      tokensPrompt?: number;
      tokensCompletion?: number;
      model?: string;
      generationId?: string;
      conversationId?: string;
    },
  ): Promise<void> {
    const startTime = Date.now();
    console.log("metadata", metadata);
    try {
      const hashStartTime = Date.now();
      const hashedKey = this.hashKey(key);
      const hashTime = Date.now() - hashStartTime;

      const cacheTable = this.getCacheTable();

      const insertStartTime = Date.now();

      // Base values that all cache tables have
      const baseValues = {
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
      };

      // Add conversationId only for detrans_chat mode
      const values =
        this.mode === "detrans_chat"
          ? { ...baseValues, conversationId: metadata?.conversationId || null }
          : baseValues;

      const baseUpdateSet = {
        resultText: value,
        lastAccessed: new Date(),
        ...(metadata && {
          totalCost: metadata.totalCost?.toString() || null,
          tokensPrompt: metadata.tokensPrompt || null,
          tokensCompletion: metadata.tokensCompletion || null,
          model: metadata.model || null,
          generationId: metadata.generationId || null,
        }),
      };

      // Add conversationId to update set only for detrans_chat mode
      const updateSet =
        this.mode === "detrans_chat" && metadata
          ? {
              ...baseUpdateSet,
              conversationId: metadata.conversationId || null,
            }
          : baseUpdateSet;

      await db.insert(cacheTable).values(values).onConflictDoUpdate({
        target: cacheTable.promptHash,
        set: updateSet,
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

export function makeLlmCacheKey(
  question: string,
  messages: any[],
  options: any,
  mode?: string,
): string {
  if (mode === "detrans_chat") {
    // Include entire conversation history and tool parameters
    return JSON.stringify({
      messages,
      tools: options.tools?.map((t: any) => t.name),
    });
  }
  return question + ":llm:" + JSON.stringify({ messages, ...options });
}
