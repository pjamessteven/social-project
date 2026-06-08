import { connectRedis } from "@/app/lib/redis";
import type { MessageContentDetail } from "llamaindex";
import {
  fetchMentions,
  fetchThreadChain,
  postReply,
  type MentionData,
  type ThreadTweet,
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
  const lines: string[] = [];

  // Build a lookup of tweet ID → author handle for labeling references
  const handleMap = new Map<string, string>();
  for (const tweet of thread) {
    handleMap.set(tweet.id, tweet.authorUsername || `user_${tweet.authorId}`);
  }

  // Separate quoted content (tweets that other tweets reference via "quoted")
  const quotedIds = new Set<string>();
  for (const tweet of thread) {
    for (const ref of tweet.referencedTweets ?? []) {
      if (ref.type === "quoted") quotedIds.add(ref.id);
    }
  }

  // Output quoted/original content first if present
  const quotedTweets = thread.filter((t) => quotedIds.has(t.id));
  if (quotedTweets.length > 0) {
    lines.push("### Quoted Content");
    for (const tweet of quotedTweets) {
      const handle = handleMap.get(tweet.id) || `user_${tweet.authorId}`;
      lines.push(`@${handle}: ${tweet.text}`);
    }
    lines.push("");
  }

  // Output the conversation thread (excluding already-shown quoted content)
  const conversationTweets = thread.filter((t) => !quotedIds.has(t.id));
  if (conversationTweets.length > 0) {
    lines.push("### Conversation Thread");
    for (const tweet of conversationTweets) {
      const handle = handleMap.get(tweet.id) || `user_${tweet.authorId}`;
      const prefix = tweet.isMention ? "[MENTION] " : "";

      // Label what this tweet is referencing
      const refs = tweet.referencedTweets ?? [];
      const quoteRef = refs.find((r) => r.type === "quoted");
      const replyRef = refs.find((r) => r.type === "replied_to");

      let suffix = "";
      if (quoteRef) {
        const quotedHandle = handleMap.get(quoteRef.id);
        suffix = quotedHandle
          ? ` (quote tweeted @${quotedHandle}'s post)`
          : " (quote tweet)";
      } else if (replyRef) {
        const replyHandle = handleMap.get(replyRef.id);
        suffix = replyHandle ? ` (replying to @${replyHandle})` : " (reply)";
      }

      lines.push(`@${handle}: ${prefix}${tweet.text}${suffix}`);
    }
  }

  lines.push("");
  lines.push("### The Mention");
  const mentionUsernameStr = mentionUsername || "user";
  lines.push(
    `@${mentionUsernameStr} mentioned @detrans.ai in the above conversation.`,
  );
  lines.push("");
  lines.push(
    `Reply to @${mentionUsernameStr}'s message above. The rest of the thread is context only.`,
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

async function markProcessed(redis: any, mentionId: string): Promise<void> {
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

  // Filter mentions
  const nonSelfMentions = mentions.filter((m) => {
    // Skip if bot authored the mention
    if (m.authorId === userId) return false;
    // Skip if replying to bot's tweet, unless explicitly mentioning @DetransAI
    if (m.inReplyToUserId === userId) {
      const text = m.text?.toLowerCase() || "";
      const explicitlyMentionsBot = text.includes("@detransai");
      if (!explicitlyMentionsBot) return false;
    }
    // Skip @grok threads entirely
    const text = m.text?.toLowerCase() || "";
    if (text.includes("@grok")) return false;
    return true;
  });
  if (nonSelfMentions.length < mentions.length) {
    console.log(
      `[TWITTER BOT] Filtered ${mentions.length - nonSelfMentions.length} self-replies or replies to bot`,
    );
  }

  // Filter already processed
  const newMentions: MentionData[] = [];
  for (const mention of nonSelfMentions) {
    const isProcessed = await redis.sIsMember(PROCESSED_SET_KEY, mention.id);
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

      // Fetch full thread context (walks up reply/quote chain)
      const thread = await fetchThreadChain(mention.id, MAX_THREAD_DEPTH);
      console.log(`[TWITTER BOT] Thread has ${thread.length} tweets`);

      const context = formatThreadForLLM(thread, mention.authorUsername);
      console.log("[TWITTER BOT] Full context:\n" + context);

      // Build multimodal content with images from the mention tweet
      const mentionTweet = thread.find((t) => t.isMention);
      const contentParts: MessageContentDetail[] = [
        { type: "text", text: context },
      ];
      if (mentionTweet?.imageUrls?.length) {
        for (const url of mentionTweet.imageUrls) {
          contentParts.push({ type: "image_url", image_url: { url } });
        }
        console.log(
          `[TWITTER BOT] Including ${mentionTweet.imageUrls.length} image(s) from mention tweet`,
        );
      }

      // Generate reply via LlamaIndex agent
      console.log("[TWITTER BOT] Generating reply...");
      const result = await workflow.run(contentParts);
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
