import { Client, OAuth1 } from "@xdevplatform/xdk";

export interface ThreadTweet {
  id: string;
  text: string;
  authorId: string | undefined;
  authorUsername: string | undefined;
  createdAt: string | undefined;
  isMention: boolean;
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

export async function fetchThread(
  mentionId: string,
  maxDepth = 20,
): Promise<ThreadTweet[]> {
  const client = getReadClient();

  // Step 1: Get mention tweet to find conversation_id
  const mentionResponse = await client.posts.getById(mentionId, {
    tweetFields: ["conversation_id"],
  });

  const conversationId = (mentionResponse.data as any)?.conversationId;
  if (!conversationId) {
    // Fallback: if no conversation_id, return just the mention itself
    const tweet = mentionResponse.data as any;
    if (!tweet) return [];
    return [
      {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.authorId,
        authorUsername: undefined,
        createdAt: tweet.createdAt,
        isMention: true,
      },
    ];
  }

  // Step 2: Search for all tweets in the conversation
  const searchResponse = await client.posts.searchRecent(
    `conversation_id:${conversationId}`,
    {
      maxResults: Math.min(maxDepth, 100),
      tweetFields: ["author_id", "text", "created_at"],
      userFields: ["username"],
      expansions: ["author_id"],
    },
  );

  const tweets = (searchResponse.data ?? []) as any[];
  const users = (searchResponse.includes?.users ?? []) as any[];

  // Step 3: Map to ThreadTweet format
  const thread: ThreadTweet[] = tweets.map((tweet) => {
    const author = users.find((u) => u.id === tweet.authorId);
    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.authorId,
      authorUsername: author?.username,
      createdAt: tweet.createdAt,
      isMention: tweet.id === mentionId,
    };
  });

  // Step 4: Sort chronologically (oldest first)
  thread.sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime(),
  );

  return thread;
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
