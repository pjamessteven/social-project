import {
  affirmCache,
  db,
  detransCache,
  detransChatCache,
} from "@/db";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, questionName?: string, metadata?: {
    totalCost?: number;
    tokensPrompt?: number;
    tokensCompletion?: number;
    model?: string;
    generationId?: string;
  }): Promise<void>;
}

export class PostgresCache implements Cache {
  constructor(private mode: "detrans" | "affirm" | "detrans_chat") {}

  private getCacheTable() {
    if (this.mode === "detrans_chat") return detransChatCache;
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

  async set(key: string, value: string, questionName?: string, metadata?: {
    totalCost?: number;
    tokensPrompt?: number;
    tokensCompletion?: number;
    model?: string;
    generationId?: string;
  }): Promise<void> {
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


export function makeLlmCacheKey(
  question: string,
  prompt: string,
  options: any,
): string {
  return question + ":llm:" + JSON.stringify({ prompt, ...options });
}


