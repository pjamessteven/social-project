import { connectRedis } from "./redis";

const MESSAGE_COUNT_LIMIT = 10;
const MESSAGE_COUNT_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Get the current message count for an IP address
 * Returns null if no count exists (new user or after CAPTCHA reset)
 */
export async function getMessageCount(
  ipAddress: string,
): Promise<number | null> {
  const redis = await connectRedis();
  if (!redis) return null;

  const key = `message:count:${ipAddress}`;
  const count = await redis.get(key);
  return count === null ? null : parseInt(count, 10);
}

/**
 * Increment the message count for an IP address
 * Returns the new count
 */
export async function incrementMessageCount(
  ipAddress: string,
): Promise<number> {
  const redis = await connectRedis();
  if (!redis) return 0;

  const key = `message:count:${ipAddress}`;
  const newCount = await redis.incr(key);

  // Set expiry on first increment
  if (newCount === 1) {
    await redis.expire(key, MESSAGE_COUNT_TTL);
  }

  return newCount;
}

/**
 * Initialize or reset the message count for an IP address (called after CAPTCHA verification)
 * Sets count to 0, allowing the user to send up to MESSAGE_COUNT_LIMIT messages
 */
export async function initializeMessageCount(ipAddress: string): Promise<void> {
  const redis = await connectRedis();
  if (!redis) return;

  const key = `message:count:${ipAddress}`;
  await redis.setEx(key, MESSAGE_COUNT_TTL, "0");
}

/**
 * Check if CAPTCHA is required based on message count
 * Returns true if:
 * - User is new (no count exists) - requires CAPTCHA on first use
 * - User has sent 10 or more messages since last CAPTCHA verification
 */
export async function isCaptchaRequired(ipAddress: string): Promise<boolean> {
  const count = await getMessageCount(ipAddress);

  // If no count exists, this is either a new user or they just completed CAPTCHA
  // In both cases, they need to complete CAPTCHA to start/continue
  if (count === null) {
    return true;
  }

  // Require CAPTCHA after 10 messages
  return count >= MESSAGE_COUNT_LIMIT;
}

/**
 * Get remaining messages before CAPTCHA is required
 * Returns 0 if CAPTCHA is required now
 */
export async function getMessagesUntilCaptchaRequired(
  ipAddress: string,
): Promise<number> {
  const count = await getMessageCount(ipAddress);

  // If no count exists, CAPTCHA is required immediately
  if (count === null) {
    return 0;
  }

  return Math.max(0, MESSAGE_COUNT_LIMIT - count);
}
