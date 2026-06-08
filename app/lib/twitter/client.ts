import { Client, OAuth1 } from "@xdevplatform/xdk";

export interface ThreadTweet {
  id: string;
  text: string;
  authorId: string | undefined;
  authorUsername: string | undefined;
  createdAt: string | undefined;
  isMention: boolean;
  referencedTweets: { type: string; id: string }[] | undefined;
  imageUrls: string[];
}

export interface MentionData {
  id: string;
  text: string;
  authorId: string | undefined;
  authorUsername: string | undefined;
  createdAt: string | undefined;
  referencedTweets: { type: string; id: string }[] | undefined;
}

function getReadClient(): Client {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not set");
  return new Client({ bearerToken: token });
}

function getWriteClient(): Client {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error("OAuth 1.0a credentials are not fully set");
  }
  const oauth1 = new OAuth1({
    apiKey,
    apiSecret,
    callback: "https://detrans.ai",
    accessToken,
    accessTokenSecret: accessSecret,
  });
  return new Client({ oauth1 });
}

export async function fetchMentions(userId: string): Promise<MentionData[]> {
  const client = getReadClient();
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const response = await client.users.getMentions(userId, {
    maxResults: 20,
    startTime: twentyFourHoursAgo,
    tweetFields: [
      "conversation_id",
      "author_id",
      "in_reply_to_user_id",
      "referenced_tweets",
      "created_at",
    ],
    userFields: ["username"],
    expansions: ["author_id"],
  });

  const tweets = response.data ?? [];
  const users = response.includes?.users ?? [];

  return tweets.map((tweet: any) => {
    const author = users.find((u: any) => u.id === tweet.author_id);
    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      authorUsername: author?.username,
      createdAt: tweet.created_at,
      referencedTweets: tweet.referenced_tweets,
    };
  });
}

const MAX_CHAIN_DEPTH = 10;

function extractImageUrls(data: any, includes: any): string[] {
  const urls: string[] = [];

  // URL card preview images
  for (const urlEntity of data.entities?.urls ?? []) {
    for (const img of urlEntity.images ?? []) {
      if (img.url) urls.push(img.url);
    }
  }

  // Attached media (type === "photo")
  for (const media of includes?.media ?? []) {
    if (media.type === "photo" && media.url) {
      urls.push(media.url);
    }
  }

  return urls;
}

export async function fetchThreadChain(
  mentionId: string,
  maxDepth = MAX_CHAIN_DEPTH,
): Promise<ThreadTweet[]> {
  const client = getReadClient();
  const visited = new Set<string>();
  const collected: ThreadTweet[] = [];

  async function walk(tweetId: string, depth: number): Promise<void> {
    if (depth > maxDepth || visited.has(tweetId)) return;
    visited.add(tweetId);

    let data: any;
    let includes: any;
    try {
      const response = await client.posts.getById(tweetId, {
        tweetFields: [
          "referenced_tweets",
          "author_id",
          "created_at",
          "text",
          "entities",
          "attachments",
        ],
        expansions: [
          "referenced_tweets.id",
          "author_id",
          "attachments.media_keys",
        ],
        userFields: ["username"],
        mediaFields: ["url", "preview_image_url", "type"],
      });
      data = response.data as any;
      includes = response.includes as any;
    } catch (error: any) {
      // Deleted, protected, or inaccessible tweet — skip
      console.warn(
        `[TWITTER BOT] Could not fetch tweet ${tweetId}:`,
        error.message || error,
      );
      return;
    }

    if (!data) return;

    const users = includes?.users ?? [];
    const expandedTweets = includes?.tweets ?? [];

    const author = users.find((u: any) => u.id === data.authorId);
    collected.push({
      id: data.id,
      text: data.text,
      authorId: data.authorId,
      authorUsername: author?.username,
      createdAt: data.createdAt || data.created_at,
      isMention: tweetId === mentionId,
      referencedTweets: data.referencedTweets || data.referenced_tweets,
      imageUrls: extractImageUrls(data, includes),
    });

    // Walk up referenced tweets (replied_to, quoted, etc.)
    const refs: { type: string; id: string }[] =
      data.referencedTweets ?? data.referenced_tweets ?? [];
    for (const ref of refs) {
      if (visited.has(ref.id)) continue;

      // Check if the expanded data is already in includes
      const expanded = expandedTweets.find((t: any) => t.id === ref.id);
      if (expanded) {
        // Use inline data without extra API call
        const expandedAuthor = users.find(
          (u: any) => u.id === expanded.authorId,
        );
        collected.push({
          id: expanded.id,
          text: expanded.text,
          authorId: expanded.authorId,
          authorUsername: expandedAuthor?.username,
          createdAt: expanded.createdAt || expanded.created_at,
          isMention: false,
          referencedTweets:
            expanded.referencedTweets || expanded.referenced_tweets,
          imageUrls: extractImageUrls(expanded, {}),
        });
        visited.add(ref.id);
        // Continue walking up from expanded tweet's references
        const expandedRefs: { type: string; id: string }[] =
          expanded.referencedTweets ?? expanded.referenced_tweets ?? [];
        for (const expandedRef of expandedRefs) {
          await walk(expandedRef.id, depth + 1);
        }
      } else {
        // Not in includes — fetch it
        await walk(ref.id, depth + 1);
      }
    }
  }

  await walk(mentionId, 0);

  // Deduplicate by ID
  const seen = new Set<string>();
  const unique: ThreadTweet[] = [];
  for (const tweet of collected) {
    if (!seen.has(tweet.id)) {
      seen.add(tweet.id);
      unique.push(tweet);
    }
  }

  // Sort chronologically (oldest first)
  unique.sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime(),
  );

  return unique;
}

export async function postReply(
  text: string,
  inReplyToTweetId: string,
): Promise<void> {
  const client = getWriteClient();
  await client.posts.create({
    text,
    reply: { in_reply_to_tweet_id: inReplyToTweetId },
  });
}
