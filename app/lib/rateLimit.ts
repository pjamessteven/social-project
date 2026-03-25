import { NextResponse } from "next/server";
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

// Dual-window rate limiting: per-minute and per-hour
interface DualWindowResult {
  allowed: boolean;
  perMinuteRemaining: number;
  perHourRemaining: number;
  retryAfter?: number; // seconds until next allowed request
}

interface RateLimitConfig {
  perMinute: number;
  perHour: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  perMinute: Number(process.env.RATE_LIMIT_PER_MINUTE) || 10,
  perHour: Number(process.env.RATE_LIMIT_PER_HOUR) || 100,
};

export async function rateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {},
): Promise<DualWindowResult> {
  const { perMinute, perHour } = { ...DEFAULT_RATE_LIMIT, ...config };
  const redis = await connectRedis();

  if (!redis) {
    return {
      allowed: true,
      perMinuteRemaining: perMinute,
      perHourRemaining: perHour,
    };
  }

  const now = Date.now();
  const minuteKey = `ratelimit:${identifier}:minute:${Math.floor(now / 60000)}`;
  const hourKey = `ratelimit:${identifier}:hour:${Math.floor(now / 3600000)}`;

  // Use multi (transaction) instead of pipeline for better compatibility
  const multi = redis.multi();
  multi.incr(minuteKey);
  multi.incr(hourKey);

  const results = await multi.exec();

  // redis package returns array of values directly: [minuteCount, hourCount]
  // Handle Redis reply union type - could be number, string, etc.
  const minuteCount = results?.[0] ? Number(results[0]) : 0;
  const hourCount = results?.[1] ? Number(results[1]) : 0;

  // Set TTL only on first increment to prevent extending the window
  if (minuteCount === 1) {
    await redis.expire(minuteKey, 60);
  }
  if (hourCount === 1) {
    await redis.expire(hourKey, 3600);
  }

  const minuteRemaining = Math.max(0, perMinute - minuteCount);
  const hourRemaining = Math.max(0, perHour - hourCount);
  console.log(
    minuteCount,
    hourCount,
    "remaining",
    minuteRemaining,
    hourRemaining,
  );
  // Use strict comparison: count must be <= limit (e.g., 10 requests allowed: counts 1-10)
  const allowed = minuteCount <= perMinute && hourCount <= perHour;

  let retryAfter: number | undefined;
  if (!allowed) {
    if (minuteCount > perMinute) {
      retryAfter = 60 - ((now / 1000) % 60);
    } else {
      retryAfter = 3600 - ((now / 1000) % 3600);
    }
  }

  return {
    allowed,
    perMinuteRemaining: minuteRemaining,
    perHourRemaining: hourRemaining,
    retryAfter: retryAfter ? Math.ceil(retryAfter) : undefined,
  };
}

// Helper to extract IP from request
export function getClientIP(request: Request): string {
  const headers = request.headers;

  // Check various headers for the real IP (common proxy/CDN headers)
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Handle IPv6-mapped IPv4 addresses by stripping ::ffff: prefix
    const ip = forwardedFor.split(",")[0].trim();
    return ip.replace(/^::ffff:/, "");
  }

  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback (in dev, this will be ::1 or 127.0.0.1)
  return "unknown";
}

/**
 * Helper function to enforce rate limiting in API routes.
 * Returns null if request is allowed, or a NextResponse if rate limited.
 *
 * Usage in API route:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = await checkRateLimit(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Your route logic here
 * }
 * ```
 */
export async function checkRateLimit(
  request: Request,
  config?: Partial<RateLimitConfig>,
): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const result = await rateLimit(ip, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Please slow down.",
        retryAfter: result.retryAfter,
      },
      { status: 429 },
    );
  }

  return null;
}
