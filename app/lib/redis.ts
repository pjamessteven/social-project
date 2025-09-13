// lib/redis.ts
import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;

export function getRedis() {
  // Skip Redis entirely at build time
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) return null; // no URL set
    client = createClient({ url });
    client.on("error", (e) => console.error("Redis error:", e));
  }
  return client;
}

export async function connectRedis() {
  const redis = getRedis();
  if (!redis) return null;
  if (!redis.isOpen) {
    try {
      await redis.connect();
    } catch (e) {
      console.error("Redis connection failed:", e);
      return null;
    }
  }
  return redis;
}
