import { connectRedis } from "@/app/lib/redis";
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

export class RedisCache implements Cache {
  private prefix: string;

  constructor(private mode: "detrans_chat" | "deep_research") {
    this.prefix = `cache:${mode}:`;
  }

  async get(hashedKey: string): Promise<string | null> {
    try {
      const redis = await connectRedis();
      if (!redis) return null;

      const result = await redis.get(`${this.prefix}${hashedKey}`);
      return result ?? null;
    } catch (error) {
      console.error("Redis cache get error:", error);
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
      requestId?: string;
      iteration?: number;
    },
  ): Promise<void> {
    try {
      const redis = await connectRedis();
      if (!redis) return;

      await redis.set(`${this.prefix}${hashedKey}`, value, { EX: 1209600 });
    } catch (error) {
      console.error("Redis cache set error:", error);
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
        tools: options.tools?.map((t: any) => t?.name || null),
      })
    : JSON.stringify({ messages, ...options });
}

export function makeHashedKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
