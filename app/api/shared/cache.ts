import { db, detransChatCache, detransResearchCache } from "@/db";
import { eq } from "drizzle-orm";
export interface Cache {
  get(hashedKey: string): Promise<string | null>;
  set(
    hashedKey: string,
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
  constructor(private mode: "detrans_chat" | "deep_research") {}

  private getCacheTable() {
    if (this.mode === "detrans_chat") return detransChatCache;
    return detransResearchCache;
  }

  async get(hashedKey: string): Promise<string | null> {
    try {
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

        return result[0].resultText;
      }

      return null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  async set(
    hashedKey: string,
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
    try {
      const cacheTable = this.getCacheTable();
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

      // Add conversationId  for detrans_chat
      const values =
        this.mode === "detrans_chat"
          ? {
              ...baseValues,
              conversationId: metadata?.conversationId || null,
            }
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

      // Add conversationId to update set only for detrans_chat
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
    } catch (error) {
      console.error("Cache set error:", error);
      // Don't throw - cache failures shouldn't break the application
    }
  }
}

import { createHash } from "crypto";

export function makeCacheKey(
  messages: any[],
  options: any,
  mode?: string,
): string {
  return mode === "detrans_chat" || mode === "deep_research"
    ? JSON.stringify({
        messages,
        tools: options.tools?.map((t: any) => t.name),
      })
    : JSON.stringify({ messages, ...options });
}

export function makeHashedKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
