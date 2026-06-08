# Twitter/X Bot for @detrans.ai

An automated bot that monitors mentions of @detrans.ai on Twitter/X and replies using the same LLM-powered RAG system as the detrans.ai chatbot.

## Overview

The bot polls for new mentions every 5 minutes, reconstructs the full conversation thread for context, generates a reply using the LlamaIndex agent (with access to detransitioner stories, video transcripts, studies, and web search), and posts the reply.

```
Mention detected → Thread reconstructed → LLM generates reply → Reply posted
```

## How It Works

### Polling Cycle (every 15 minutes)

1. **Fetch mentions** — Calls `client.users.getMentions()` via the X TypeScript SDK to get the 20 most recent mentions from the last 24 hours
2. **Filter** — Removes self-replies (bot's own tweets) and already-processed IDs (Redis SET, 7-day TTL)
3. **For each new mention** (max 10 per cycle):
   - **Per-account rate limit** — Skips if the author has already received 10 replies in the last 24 hours
   - **Batch-fetch thread** — Fetches parent tweets via `client.posts.getByIds()` in batches instead of one-by-one (max 5 levels deep)
   - **Format context** — Builds a conversation string like `@user1: original tweet\n@user2: reply...`
   - **Generate reply** — Runs the LlamaIndex agent with the full thread as context
   - **Mark processed** — Adds mention ID to Redis (before posting, to prevent double-reply on crash)
   - **Post reply** — Calls `client.posts.create()` with `reply.in_reply_to_tweet_id`

### Error Handling

The bot classifies errors into three categories:

| Category | Examples | Behavior |
|---|---|---|
| **Deleted tweet** | 404, error code 144 | Logged as "skipped (deleted)", marked as processed |
| **Retryable** | 429 rate limit, ECONNRESET, 5xx server errors | NOT marked as processed, retries next cycle |
| **Permanent** | 403 unauthorized, other errors | Logged as error, marked as processed |

This means:
- Network hiccups won't lose mentions — they'll be retried
- Deleted tweets won't fill the error log
- The bot won't double-reply (mark-before-post order)

### Tools Available to the LLM

The bot uses the same tools as the detrans.ai chatbot:

| Tool | Source | Purpose |
|---|---|---|
| `queryComments` | Qdrant (r/detrans comments) | Search detransitioner experiences |
| `queryVideos` | Qdrant (video transcripts) | Find relevant video testimonies |
| `getStudies` | Postgres (studies table) | Query academic studies |
| `webSearch` | Brave Search API | General web search |

### System Prompt

The bot's system prompt is in `app/lib/twitter/prompt.ts`. It's adapted from the main chatbot prompt with these key differences:

- **Conversational tone** — Designed for Twitter's casual format
- **SKIP mechanism** — Returns "SKIP" for spam, irrelevant, or bot-generated mentions
- **No follow-up questions** — Doesn't suggest follow-ups like the chatbot does
- **Brief replies** — Prefers concise responses over long explanations

## Environment Variables

Add these to your `.env` file:

```bash
# Twitter API — Bearer Token (app-only auth, for reading mentions and threads)
X_BEARER_TOKEN=your_bearer_token_here

# Twitter API — OAuth 1.0a (for posting replies)
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# Twitter API — User ID (numeric ID for @detrans.ai)
X_USER_ID=1993842915647672320

# Optional: Set to "true" to log without posting replies
DRY_RUN=true
```

### Getting Credentials

1. Go to [developer.x.com](https://developer.x.com) → Developer Portal
2. Create an App under your Project
3. In **Settings**, set App permissions to **Read and write**
4. In **Keys and tokens**, generate:
   - **Bearer Token** → `X_BEARER_TOKEN`
   - **API Key and Secret** → `X_API_KEY`, `X_API_SECRET`
   - **Access Token and Secret** → `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
5. The numeric User ID can be found in the Developer Portal or via the API

### Auth Method

| Action | Auth Type | Credential Used |
|---|---|---|
| Read mentions | Bearer Token (app-only) | `X_BEARER_TOKEN` |
| Read tweet threads | Bearer Token (app-only) | `X_BEARER_TOKEN` |
| Post replies | OAuth 1.0a | `X_API_KEY` + `X_API_SECRET` + `X_ACCESS_TOKEN` + `X_ACCESS_TOKEN_SECRET` |

OAuth 1.0a tokens don't expire, so the bot runs indefinitely without token refresh.

## File Structure

```
app/lib/twitter/
├── bot.ts          # Main orchestrator (poll → filter → thread → generate → reply)
├── client.ts       # Twitter API v2 client (readClient, writeClient, fetchMentions, fetchThread, postReply)
├── prompt.ts       # System prompt constant
└── workflow.ts     # LlamaIndex agent factory (reuses existing tools)

scripts/
└── twitter-bot.ts  # Entry point with node-cron scheduler
```

### Key Functions

**`client.ts`**
- `fetchMentions(userId)` — Gets recent mentions via `client.users.getMentions()` with author usernames
- `fetchThread(mentionId, maxDepth)` — Batch-fetches parent tweets via `client.posts.getByIds()`, returns `[root, ..., parent, mention]`
- `postReply(text, inReplyToTweetId)` — Posts a reply via `client.posts.create()`

**`bot.ts`**
- `processMentionsCycle()` — Main loop: fetch → filter → thread → generate → reply
- `formatThreadForLLM(thread)` — Converts thread array to context string for the LLM
- `extractReplyText(result)` — Extracts the reply text from the LlamaIndex agent result

**`workflow.ts`**
- `createTwitterWorkflow()` — Creates a LlamaIndex agent with all tools and the Twitter-specific system prompt

## Testing Locally

### Prerequisites

1. Redis, Qdrant, and Postgres must be running.

   **Option A: Production compose** (standard ports — recommended if running the bot outside Docker):
   ```bash
   docker compose up redis qdrant postgres -d
   ```
   This binds Redis to `6379`, Qdrant to `6333`, Postgres to `5432`.

   **Option B: Dev compose** (non-standard ports to avoid conflicts):
   ```bash
   docker compose -f docker-compose.dev.yml up redis qdrant postgres -d
   ```
   This binds Redis to `6380`, Qdrant to `6334`, Postgres to `5433`. If using this, override the env vars when running the bot:
   ```bash
   REDIS_URL=redis://localhost:6380 \
   QDRANT_URL=http://localhost:6334 \
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/app \
   npx tsx scripts/twitter-bot.ts
   ```

2. All `.env` variables must be set (Twitter credentials + existing ones like `OPENROUTER_KEY`, etc.)

### Run the Bot

```bash
# Production compose (standard ports)
npx tsx scripts/twitter-bot.ts

# Dev compose (override ports)
REDIS_URL=redis://localhost:6380 \
QDRANT_URL=http://localhost:6334 \
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/app \
npx tsx scripts/twitter-bot.ts
```

You'll see output like:

```
[TWITTER BOT] Starting...
[TWITTER BOT] Scheduled. Polling every 5 minutes.
[TWITTER BOT] Fetching mentions...
[TWITTER BOT] Found 12 mentions
[TWITTER BOT] Processing 3 new mentions
[TWITTER BOT] Processing mention 1234567890: "Hey @detrans.ai what do you think about..."
[TWITTER BOT] Thread has 4 tweets
[TWITTER BOT] Generating reply...
[TWITTER BOT] Replied to 1234567890: "Based on what many detransitioners have shared..."
[TWITTER BOT] Cycle complete
```

### Test Without Posting

Set `DRY_RUN=true` in your `.env` file or pass it inline:

```bash
DRY_RUN=true npx tsx scripts/twitter-bot.ts
```

The bot will log what it would do without actually posting replies:

```
[TWITTER BOT] DRY RUN MODE — no replies will be posted
[DRY RUN] Would reply to 1234567890: "Based on what many detransitioners have shared..."
```

### Test a Single Mention

To test the full pipeline on a specific mention, you can create a quick test script:

```typescript
// scripts/twitter-bot-test.ts
import "dotenv/config";
import { fetchThread } from "../app/lib/twitter/client";
import { createTwitterWorkflow } from "../app/lib/twitter/workflow";

const MENTION_ID = "your_mention_id_here";

async function test() {
  const thread = await fetchThread(MENTION_ID, 20);
  console.log("Thread:", JSON.stringify(thread, null, 2));

  const context = [
    "### Conversation Thread",
    "",
    ...thread.map(t => `@user_${t.authorId}: ${t.text}`),
    "",
    "### The Mention",
    `@user_${thread.find(t => t.isMention)?.authorId} mentioned @detrans.ai.`,
    "Generate a helpful reply.",
  ].join("\n");

  console.log("\nContext for LLM:\n", context);

  const workflow = await createTwitterWorkflow();
  const result = await workflow.run(context);
  console.log("\nResult:", JSON.stringify(result, null, 2));
}

test().catch(console.error);
```

Run with:

```bash
npx tsx scripts/twitter-bot-test.ts
```

## Deployment

The bot runs as a separate Docker service alongside the main Next.js app.

### Docker Compose

The `twitter-bot` service is defined in `docker-compose.yml`:

```yaml
twitter-bot:
  platform: linux/amd64
  build:
    context: .
    dockerfile: Dockerfile
  command: ["node", "--import", "tsx", "scripts/twitter-bot.ts"]
  env_file:
    - .env
  environment:
    - NODE_ENV=production
    - REDIS_URL=redis://redis:6379
    - QDRANT_URL=http://qdrant:6333
    - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
  depends_on:
    - redis
    - qdrant
    - postgres
  restart: unless-stopped
```

### Deploy

```bash
# Rebuild and start all services including the bot
docker compose up --build -d

# View bot logs
docker compose logs -f twitter-bot

# Restart just the bot
docker compose restart twitter-bot
```

## Cost Estimate

At ~30 mentions/day (polling every 15 minutes):

| Item | Monthly Cost |
|---|---|
| Twitter API (reads + writes) | ~$14.50 |
| LLM (OpenRouter, 30 tool-augmented calls) | ~$5-15 |
| **Total** | **~$20-30/month** |

Twitter API pricing (pay-per-use):

| Operation | Cost |
|---|---|
| Read mentions (owned read) | $0.001 per tweet |
| Read tweet thread (owned read) | $0.001 per tweet |
| Post reply | $0.015 per reply |

## Troubleshooting

### Bot not detecting mentions

- Verify `X_USER_ID` is correct (numeric ID, not username)
- Check that `X_BEARER_TOKEN` is valid: `curl -H "Authorization: Bearer $X_BEARER_TOKEN" "https://api.x.com/2/users/me"`
- Ensure the app has **Read** permissions

### Replies failing to post

- Verify your OAuth 1.0a tokens have **Read and write** permissions
- If you get a 403, regenerate your Access Token & Secret after changing permissions
- Check that `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` are all set

### LLM replies are "SKIP" for everything

- The bot may be processing old/irrelevant mentions
- Check the logs for what the LLM is receiving
- Try the test script above to debug a specific mention

### Bot is slow to reply

- Each reply requires multiple tool calls (queryComments, etc.), which takes 10-30 seconds
- Thread walking adds ~1-3 seconds per parent tweet
- This is expected behavior — the bot prioritizes quality over speed

### Redis connection errors

- Ensure Redis is running: `docker compose up redis -d`
- Check `REDIS_URL` in `.env` — should be:
  - `redis://redis:6379` inside Docker
  - `redis://localhost:6379` locally with production compose
  - `redis://localhost:6380` locally with dev compose (`docker-compose.dev.yml`)
- Same applies to Qdrant (`6333` vs `6334`) and Postgres (`5432` vs `5433`)

## Editing the Prompt

The system prompt is in `app/lib/twitter/prompt.ts`. To modify the bot's behavior:

1. Edit the `twitterBotPrompt` string
2. Restart the bot: `docker compose restart twitter-bot`

Key sections to customize:

- **Tone** — Adjust how casual/formal the bot sounds
- **Rules** — Add or remove behavioral constraints
- **SKIP conditions** — Change what the bot considers skippable

## Safety & Rate Limiting

### Per-Account Reply Limit
The bot will not reply more than **10 times** to the same account within a 24-hour window. This prevents spamming users who repeatedly mention @detrans.ai.

### 24-Hour Mention Window
Only mentions from the last 24 hours are fetched. On first boot, the bot won't reply to historical mentions.

### Self-Reply Prevention
Mentions authored by the bot itself (`X_USER_ID`) are automatically filtered out.

### Double-Reply Prevention
Mentions are marked as processed in Redis *before* posting the reply. If the bot crashes mid-cycle, it won't double-reply.

### Dry Run Mode
Set `DRY_RUN=true` to test the full pipeline without posting. Logs what the bot would do.

### Redis Keys

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `twitter:processed_mentions` | SET | 7 days (rolling) | Mention IDs already handled |
| `twitter:replies:{author_id}` | String (counter) | 24 hours | Per-account reply count |

## Security Notes

- OAuth 1.0a tokens never expire — store them securely
- The bot uses the same LLM and tools as the main chatbot, so the same safety guardrails apply
- Retryable errors (network, rate limit) are not marked as processed, so mentions are retried next cycle
- Deleted tweets are logged as "skipped" and marked as processed
- Processed mention IDs expire from Redis after 7 days
