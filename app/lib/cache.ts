// lib/cache.ts
import { connectRedis } from "./redis";

export async function getCached(
  prefix: string,
  key: string,
): Promise<string | undefined> {
  const redis = await connectRedis();
  let cached;
  if (redis) {
    cached = await redis.get(`${prefix}:${key}`);
  }
  return cached || undefined;
}

export async function incrementPageViews(
  prefix: string,
  key: string,
): Promise<number | undefined> {
  const redis = await connectRedis();
  let cached;
  if (redis) {
    cached = await redis.incr(`${prefix}:${key}:pageviews`);
  }
  return cached || undefined;
}
