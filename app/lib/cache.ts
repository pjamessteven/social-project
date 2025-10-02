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

export async function incrementPageViews(mode: string, page: string) {
  const now = Math.floor(Date.now() / 1000); // unix timestamp

  const key = `${mode}:${page}`;

  const redis = await connectRedis();
  if (redis) {
    // Use a MULTI transaction to keep everything atomic
    const tx = redis.multi();

    // Increment pageviews and set/update other fields
    tx.hIncrBy(key, "pageviews", 1);
    tx.hSet(key, "last_updated", now);

    // Execute the transaction so far
    const results = await tx.exec();

    // hIncrBy result is at index 0
    const newViews = Number(results[0]);

    if (typeof newViews !== "number") {
      throw new Error("Unexpected result from hIncrBy");
    }
    // Now update sorted sets with the new values
    await redis
      .multi()
      .zAdd(`${mode}:page_views`, [{ score: newViews, value: page }])
      .zAdd(`${mode}:page_updates`, [{ score: now, value: page }])
      .exec();

    return newViews;
  }
}
