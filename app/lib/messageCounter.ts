import { connectRedis } from "./redis";

const MESSAGE_COUNT_LIMIT = parseInt(
  process.env.CAPTCHA_MESSAGE_LIMIT || "1",
  10,
);
const CHAT_MESSAGE_COUNT_LIMIT = parseInt(
  process.env.CAPTCHA_CHAT_MESSAGE_LIMIT || "10",
  10,
);
const MESSAGE_COUNT_TTL = 24 * 60 * 60; // 24 hours in seconds
const CONVERSATIONS_PASS_TTL = 60; // "All conversations" one-time pass (seconds)

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
 *
 * Note: CAPTCHA is always disabled in development mode
 */
export async function isCaptchaRequired(ipAddress: string): Promise<boolean> {
  // Skip CAPTCHA in development mode
  if (process.env.NODE_ENV === "development") {
    //return false;
  }

  const count = await getMessageCount(ipAddress);

  // If no count exists, this is either a new user or they just completed CAPTCHA
  // In both cases, they need to complete CAPTCHA to start/continue
  if (count === null) {
    return true;
  }

  // Require CAPTCHA after configured message limit
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

/**
 * Conversation-scoped message counter for chat.
 * Captcha is required every CHAT_MESSAGE_COUNT_LIMIT messages within the same
 * chat; starting a new chat (no count yet) requires captcha for the first
 * (non-cached) message.
 */

function conversationKey(conversationId: string): string {
  return `message:count:conversation:${conversationId}`;
}

/**
 * Get the current message count for a conversation
 * Returns null if no count exists (new conversation or after CAPTCHA reset)
 */
export async function getConversationCount(
  conversationId: string,
): Promise<number | null> {
  const redis = await connectRedis();
  if (!redis) return null;

  const key = conversationKey(conversationId);
  const count = await redis.get(key);
  return count === null ? null : parseInt(count, 10);
}

/**
 * Increment the message count for a conversation
 * Returns the new count
 */
export async function incrementConversationCount(
  conversationId: string,
): Promise<number> {
  const redis = await connectRedis();
  if (!redis) return 0;

  const key = conversationKey(conversationId);
  const newCount = await redis.incr(key);

  // Set expiry on first increment
  if (newCount === 1) {
    await redis.expire(key, MESSAGE_COUNT_TTL);
  }

  return newCount;
}

/**
 * Reset the message count for a conversation (called after CAPTCHA verification)
 */
export async function initializeConversationCount(
  conversationId: string,
): Promise<void> {
  const redis = await connectRedis();
  if (!redis) return;

  const key = conversationKey(conversationId);
  await redis.setEx(key, MESSAGE_COUNT_TTL, "0");
}

/**
 * Check if CAPTCHA is required for a conversation
 * Returns true if:
 * - Conversation is new (no count exists) - requires CAPTCHA on first use
 * - Conversation has sent CHAT_MESSAGE_COUNT_LIMIT or more messages since last
 *   CAPTCHA verification
 */
export async function isConversationCaptchaRequired(
  conversationId: string,
): Promise<boolean> {
  const count = await getConversationCount(conversationId);

  // If no count exists, this is either a new conversation or one where the
  // user just completed CAPTCHA; both require CAPTCHA to start/continue
  if (count === null) {
    return true;
  }

  return count >= CHAT_MESSAGE_COUNT_LIMIT;
}

/**
 * One-time pass for browsing the "All conversations" list.
 * Each page fetch requires a fresh CAPTCHA verification, so the pass is
 * granted on verification and consumed (deleted) on the next fetch.
 */

function conversationsPassKey(ipAddress: string): string {
  return `captcha:verified:conversations:${ipAddress}`;
}

/**
 * Grant a one-time pass for fetching "All conversations" (after CAPTCHA verification)
 */
export async function grantConversationsPass(ipAddress: string): Promise<void> {
  const redis = await connectRedis();
  if (!redis) return;

  await redis.setEx(
    conversationsPassKey(ipAddress),
    CONVERSATIONS_PASS_TTL,
    "1",
  );
}

/**
 * Consume the one-time pass for fetching "All conversations".
 * Returns true if a pass existed (allowing the request), and deletes it so the
 * next page fetch requires CAPTCHA again.
 */
export async function consumeConversationsPass(
  ipAddress: string,
): Promise<boolean> {
  const redis = await connectRedis();
  if (!redis) return false;

  const key = conversationsPassKey(ipAddress);
  const exists = await redis.exists(key);
  if (!exists) return false;

  await redis.del(key);
  return true;
}
