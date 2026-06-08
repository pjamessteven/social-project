import { connectRedis } from "@/app/lib/redis";
import {
  fetchMentions,
  fetchThread,
  postReply,
  type ThreadTweet,
  type MentionData,
} from "./client";
import { createTwitterWorkflow } from "./workflow";

const PROCESSED_SET_KEY = "twitter:processed_mentions";
const REPLY_COUNT_PREFIX = "twitter:replies:";
const MAX_PER_CYCLE = 10;
const MAX_THREAD_DEPTH = 20;
const MAX_REPLIES_PER_ACCOUNT = 10;
const REPLY_COUNT_TTL = 24 * 60 * 60; // 24 hours

function formatThreadForLLM(
  thread: ThreadTweet[],
  mentionUsername: string | undefined,
): string {
  const lines: string[] = ["### Conversation Thread", ""];

  for (const tweet of thread) {
    const prefix = tweet.isMention ? "[MENTION] " : "";
    const handle = tweet.authorUsername || `user_${tweet.authorId}`;
    lines.push(`@${handle}: ${prefix}${tweet.text}`);
  }

  lines.push("");
  lines.push("### The Mention");
  const mention = thread.find((t) => t.isMention);
  const username = mentionUsername || "user";
  if (mention) {
    lines.push(
      `@${username} mentioned @detrans.ai in the above conversation.`,
    );
  }
  lines.push(
    "Generate a helpful reply to contribute to this conversation.",
  );

  return lines.join("\n");
}

function extractReplyText(result: any): string {
  try {
    const data = result?.data;
    // Try multiple paths for the response content
    const content =
      data?.message?.content ??
      data?.response?.content ??
      data?.data?.response?.content ??
      data?.result;

    if (content && typeof content === "string") {
      return content.trim();
    }

    // Fallback: try to extract from JSON string
    const str = JSON.stringify(result);
    const match = str.match(/"content":"((?:[^"\\]|\\.)*)"/);
    if (match) return match[1].replace(/\\"/g, '"').trim();

    console.warn(
      "[TWITTER BOT] Could not extract reply text from:",
      str.slice(0, 500),
    );
    return "SKIP";
  } catch (e) {
    console.error("[TWITTER BOT] Error extracting reply text:", e);
    return "SKIP";
  }
}

function isRetryable(error: any): boolean {
  if (error?.code === 429) return true;
  if (error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT") return true;
  if (typeof error?.code === "number" && error.code >= 500) return true;
  return false;
}

function isDeletedTweet(error: any): boolean {
  if (error?.code === 404) return true;
  if (error?.data?.errors?.[0]?.code === 144) return true;
  return false;
}

async function markProcessed(
  redis: any,
  mentionId: string,
): Promise<void> {
  await redis.sAdd(PROCESSED_SET_KEY, mentionId);
  await redis.expire(PROCESSED_SET_KEY, 7 * 24 * 60 * 60);
}

async function canReplyToAuthor(
  redis: any,
  authorId: string,
): Promise<boolean> {
  const key = `${REPLY_COUNT_PREFIX}${authorId}`;
  const count = await redis.get(key);
  return !count || parseInt(count) < MAX_REPLIES_PER_ACCOUNT;
}

async function incrementReplyCount(
  redis: any,
  authorId: string,
): Promise<void> {
  const key = `${REPLY_COUNT_PREFIX}${authorId}`;
  const newCount = await redis.incr(key);
  if (newCount === 1) {
    await redis.expire(key, REPLY_COUNT_TTL);
  }
}

export async function processMentionsCycle() {
  const userId = process.env.X_USER_ID;
  if (!userId) {
    console.error("[TWITTER BOT] X_USER_ID is not set");
    return;
  }

  const redis = await connectRedis();
  if (!redis) {
    console.error("[TWITTER BOT] Redis connection failed");
    return;
  }

  const isDryRun = process.env.DRY_RUN === "true";
  if (isDryRun) {
    console.log("[TWITTER BOT] DRY RUN MODE — no replies will be posted");
  }

  console.log("[TWITTER BOT] Fetching mentions...");
  const mentions = await fetchMentions(userId);
  console.log(`[TWITTER BOT] Found ${mentions.length} mentions (last 24h)`);

  // Skip self-replies
  const nonSelfMentions = mentions.filter((m) => m.authorId !== userId);
  if (nonSelfMentions.length < mentions.length) {
    console.log(
      `[TWITTER BOT] Filtered ${mentions.length - nonSelfMentions.length} self-replies`,
    );
  }

  // Filter already processed
  const newMentions: MentionData[] = [];
  for (const mention of nonSelfMentions) {
    const isProcessed = await redis.sIsMember(
      PROCESSED_SET_KEY,
      mention.id,
    );
    if (!isProcessed) newMentions.push(mention);
  }

  if (newMentions.length === 0) {
    console.log("[TWITTER BOT] No new mentions to process");
    return;
  }

  // Cap at max per cycle
  const toProcess = newMentions.slice(0, MAX_PER_CYCLE);
  console.log(`[TWITTER BOT] Processing ${toProcess.length} new mentions`);

  // Create workflow ONCE per cycle (reused across all mentions)
  const workflow = await createTwitterWorkflow();

  for (const mention of toProcess) {
    const authorId = mention.authorId;
    try {
      console.log(
        `[TWITTER BOT] Processing mention ${mention.id} from @${mention.authorUsername || authorId}: "${mention.text?.slice(0, 80)}..."`,
      );

      // Check per-account rate limit
      if (authorId && !(await canReplyToAuthor(redis, authorId))) {
        console.log(
          `[TWITTER BOT] Skipped ${mention.id} (account ${authorId} hit ${MAX_REPLIES_PER_ACCOUNT}/24h limit)`,
        );
        await markProcessed(redis, mention.id);
        continue;
      }

      // Fetch full thread context
      const thread = await fetchThread(mention.id, MAX_THREAD_DEPTH);
      console.log(`[TWITTER BOT] Thread has ${thread.length} tweets`);

      const context = formatThreadForLLM(thread, mention.authorUsername);

      // Generate reply via LlamaIndex agent
      console.log("[TWITTER BOT] Generating reply...");
      const result = await workflow.run(context);
      const replyText = extractReplyText(result);

      if (replyText && replyText !== "SKIP") {
        // Clean up formatting but preserve paragraph breaks
        const finalReply = replyText
          .replace(/\*\*/g, "") // strip bold markdown
          .replace(/\*/g, "") // strip italic markdown
          .replace(/^- /gm, "") // strip bullet points
          .replace(/\n{3,}/g, "\n\n") // collapse 3+ newlines to paragraph break
          .trim();

        // Mark as processed FIRST (prevents double-reply on crash)
        await markProcessed(redis, mention.id);

        if (isDryRun) {
          console.log(
            `[DRY RUN] Would reply to ${mention.id} (${finalReply.length} chars): "${finalReply}"`,
          );
        } else {
          await postReply(finalReply, mention.id);
          if (authorId) await incrementReplyCount(redis, authorId);
          console.log(
            `[TWITTER BOT] Replied to ${mention.id} (${finalReply.length} chars): "${finalReply.slice(0, 80)}..."`,
          );
        }
      } else {
        console.log(`[TWITTER BOT] Skipped mention ${mention.id} (SKIP)`);
        await markProcessed(redis, mention.id);
      }
    } catch (error: any) {
      if (isDeletedTweet(error)) {
        console.log(
          `[TWITTER BOT] Skipped ${mention.id} (tweet deleted or unavailable)`,
        );
        await markProcessed(redis, mention.id);
      } else if (isRetryable(error)) {
        console.warn(
          `[TWITTER BOT] Retryable error for ${mention.id}, will retry next cycle:`,
          error.message || error,
        );
      } else {
        console.error(
          `[TWITTER BOT] Permanent error for ${mention.id}:`,
          error,
        );
        await markProcessed(redis, mention.id);
      }
    }
  }

  console.log("[TWITTER BOT] Cycle complete");
}
