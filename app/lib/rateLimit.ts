import { connectRedis } from "./redis";
const LIMIT = Number(process.env.RATE_LIMIT_REQUESTS_PER_DAY);
const WINDOW = 24 * 3600; // seconds

type Result =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0 };

export async function rateLimiter(
  ip: string, // or user-id, session-id, etc.
  slug: string, // route slug (or "global")
  perDay: number = LIMIT,
): Promise<Result> {
  const redis = await connectRedis();
  if (redis && LIMIT) {
    const key = `pv:${ip}:${slug}:${new Date().toISOString().slice(0, 10)}`; // rolls at 00:00 UTC
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, WINDOW); // set TTL only once

    if (current > LIMIT) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: LIMIT - current };
  } else {
    return { allowed: true, remaining: 0 };
  }
}
