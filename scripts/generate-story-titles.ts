#!/usr/bin/env tsx
/**
 * Generate short descriptive titles for story spotlights with MiMo.
 *
 * Titles live in detrans_user_display_names.display_name and are rendered on
 * the story cards above the person's own summary. This script targets the
 * top-ranked stories first (highest overall Reddit score), matching the
 * spotlight ordering, and skips stories that already have a name unless
 * --force is passed.
 *
 * Usage:
 *   npx tsx scripts/generate-story-titles.ts --limit 20 --dry-run
 *   npx tsx scripts/generate-story-titles.ts --limit 100
 *   npx tsx scripts/generate-story-titles.ts --force --limit 500
 *
 * Options:
 *   --limit <n>        Stories to process (default 50)
 *   --offset <n>       Skip the first n ranked stories (default 0)
 *   --concurrency <n>  Parallel model calls (default 6)
 *   --model <id>       OpenRouter model (default xiaomi/mimo-v2.6-flash)
 *   --dry-run          Print titles without writing to the database
 *   --force            Regenerate titles that already exist
 */
import * as dotenv from "dotenv";
import { OpenAI } from "openai";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransUserDisplayNames } from "../db/schema";

dotenv.config();

const DEFAULT_MODEL = "xiaomi/mimo-v2.6-flash";
const MAX_SUMMARY_CHARS = 1600;

interface Args {
  limit: number;
  offset: number;
  concurrency: number;
  model: string;
  dryRun: boolean;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    limit: 50,
    offset: 0,
    concurrency: 6,
    model: DEFAULT_MODEL,
    dryRun: false,
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--limit") {
      args.limit = Math.max(1, Number.parseInt(argv[++i] ?? "50", 10) || 50);
    } else if (arg === "--offset") {
      args.offset = Math.max(0, Number.parseInt(argv[++i] ?? "0", 10) || 0);
    } else if (arg === "--concurrency") {
      args.concurrency = Math.max(
        1,
        Number.parseInt(argv[++i] ?? "6", 10) || 6,
      );
    } else if (arg === "--model") {
      args.model = argv[++i] ?? DEFAULT_MODEL;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--force") {
      args.force = true;
    }
  }
  return args;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SYSTEM_PROMPT = `You are the editor writing one-line titles for anonymous first-person stories on detrans.ai, a site about people who detransitioned or desisted. Each title appears on a story card above the person's own summary. You have full editorial freedom to make the title compelling — but never to distort the story.

Write it like a magazine headline, not a summary:
- Find the tension: the setup and the turn. "Coerced into transition at 15 — and left with the damage."
- Use one or two concrete details (an age, a number, an object, a place) instead of adjectives.
- Vary the shape: em dashes, "then", callbacks, a quiet twist.
- Dry irony is welcome when it comes from the story itself; contempt never is.
- Let the story speak for itself — the person's arc, not the site's opinion.

Hard rules:
- 4 to 10 words, sentence case, no period at the end.
- Impersonal or third-person voice; never first person.
- Never invent facts that are not in the summary.
- No judgment of the person, no advice, no clickbait, no scare quotes, no emoji, no real names or usernames.
- Never use the words "journey", "brave" or "lifestyle".
- Return only the title text, nothing else.

Calibration — this is the level we want:
- Coerced into transition at 15 — and left with the damage
- Two detransitions later, she's butch again
- Four years and $15k to get her voice back
- One month on estrogen, years of consequences
- Seven years as a man, then realizing transition was the escape
- She wanted to be a gay anime boy — then grew out of it
- Diagnosed at 16, operated on at 21, detransitioning by 27`;

function cleanTitle(raw: string): string {
  let title = raw.replace(/\s+/g, " ").trim();
  title = title.replace(/^[“"']+|[”"']+$/g, "").trim();
  title = title.replace(/[.!]+$/g, "").trim();
  if (title.length > 90) title = `${title.slice(0, 87).trimEnd()}…`;
  return title;
}

/** Provider moderation/error text that must never become a title. */
const ERROR_TEXT =
  /the request was rejected|considered high risk|i cannot (help|assist)|i'm sorry|as an ai|content policy|moderation/i;

/**
 * Returns a usable title, salvaging the part before a provider error message
 * when the model drafted something first. Throws when there is nothing usable
 * so the caller retries instead of writing garbage.
 */
function validateTitle(raw: string): string {
  const cleaned = cleanTitle(raw);
  if (!ERROR_TEXT.test(cleaned)) return cleaned;
  const prefix = cleanTitle(cleaned.slice(0, cleaned.search(ERROR_TEXT)));
  const words = prefix.split(" ").filter(Boolean).length;
  if (words >= 4 && !ERROR_TEXT.test(prefix)) return prefix;
  throw new Error("looks like a provider error message");
}

async function titleFor(
  openai: OpenAI,
  model: string,
  summary: string,
  attempt = 0,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0.7,
      max_tokens: 64,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Story summary:\n\n${summary}` },
      ],
      // MiMo on OpenRouter: disable reasoning/thinking, otherwise thinking
      // tokens can eat the output budget and return empty content.
      ...({
        reasoning: { enabled: false, effort: "none" },
        thinking: { type: "disabled" },
      } as Record<string, unknown>),
    } as never);
    const raw = response.choices[0]?.message?.content ?? "";
    const title = validateTitle(raw);
    if (!title) throw new Error("empty title");
    return title;
  } catch (error) {
    if (attempt >= 3) throw error;
    const backoff = 1_000 * 2 ** attempt;
    await sleep(backoff);
    return titleFor(openai, model, summary, attempt + 1);
  }
}

interface StoryRow {
  username: string;
  id: string;
  upvotes: number;
  summary: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.OPENROUTER_KEY) {
    throw new Error("OPENROUTER_KEY is not set");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: 2 });
  const db = drizzle(client);

  const rows = Array.from(
    await db.execute(sql`
      WITH up AS (
        SELECT username, SUM(score)::int AS upvotes
        FROM (
          SELECT username, score FROM detrans_comments
          UNION ALL
          SELECT username, score FROM detrans_posts
        ) i
        GROUP BY username
      ),
      lp AS (
        SELECT DISTINCT ON (username) username, experience_summary, experience
        FROM detrans_user_profiles
        ORDER BY username, run_id DESC
      ),
      status AS (
        SELECT DISTINCT ON (uf.username) uf.username, uf.choice
        FROM detrans_user_features uf
        JOIN detrans_features f ON f.id = uf.feature_id
        WHERE f.key = 'current_status'
        ORDER BY uf.username, uf.run_id DESC
      ),
      qual AS (
        SELECT DISTINCT ON (a.username) a.username, a.score AS q
        FROM detrans_user_features a
        JOIN detrans_features f ON f.id = a.feature_id AND f.key = 'quality_detail_level'
        ORDER BY a.username, a.run_id DESC
      )
      SELECT
        lp.username,
        substr(md5(lp.username), 1, 8) AS id,
        up.upvotes,
        LEFT(COALESCE(lp.experience_summary, lp.experience), ${MAX_SUMMARY_CHARS}) AS summary
      FROM lp
      JOIN up ON up.username = lp.username
      JOIN status s ON s.username = lp.username
      LEFT JOIN qual q ON q.username = lp.username
      LEFT JOIN detrans_user_display_names dn ON dn.username = lp.username
      WHERE s.choice IN ('detransitioned', 'desisted')
        AND length(COALESCE(lp.experience_summary, lp.experience)) >= 120
        AND (q.q IS NULL OR q.q >= 1)
        ${args.force ? sql`` : sql`AND dn.username IS NULL`}
      ORDER BY up.upvotes DESC
      LIMIT ${args.limit} OFFSET ${args.offset}
    `),
  ) as unknown as StoryRow[];

  if (rows.length === 0) {
    console.log("No stories to process.");
    await client.end();
    return;
  }

  console.log(
    `${args.dryRun ? "[dry run] " : ""}Generating ${rows.length} titles with ${args.model}…\n`,
  );

  let done = 0;
  let failed = 0;
  const queue = [...rows];

  const worker = async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) break;
      try {
        const title = await titleFor(openai, args.model, row.summary);
        if (!args.dryRun) {
          await db
            .insert(detransUserDisplayNames)
            .values({ username: row.username, displayName: title })
            .onConflictDoUpdate({
              target: detransUserDisplayNames.username,
              set: { displayName: title },
            });
        }
        done += 1;
        console.log(
          `[${done + failed}/${rows.length}] ${row.id} (${row.upvotes}) → ${title}`,
        );
      } catch (error) {
        failed += 1;
        console.error(
          `[${done + failed}/${rows.length}] ${row.id} FAILED:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(args.concurrency, rows.length) }, worker),
  );

  console.log(`\nDone: ${done} written, ${failed} failed.`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
