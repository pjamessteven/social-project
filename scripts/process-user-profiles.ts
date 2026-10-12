#!/usr/bin/env tsx
/**
 * Generate per-user profiles from r/detrans posts + comments with MiMo v2.6 Flash.
 *
 * Cohort: users with >= 5 usable comments at score >= 3 (same rule the original
 * stats pipeline used). Profile text uses ALL of a user's usable comments
 * (any score) plus all posts, merged chronologically.
 *
 * Output per user (detrans_user_profiles + detrans_user_timelines):
 *   experience (detailed first-person account, no username), experience_summary
 *   (<=5 sentences, first person), sex, timeline {first_dysphoria_age,
 *   transition_age, detransition_age, hormones_age, top/bottom surgery ages,
 *   blockers age, years}
 *
 * Users above --single-pass-tokens are processed map-reduce: item-boundary
 * chunks (<= --chunk-tokens) are summarised into structured slice summaries
 * (stored in detrans_user_profile_chunks), then a reduce call produces the
 * same output schema as single-pass.
 *
 * Usage:
 *   npx tsx scripts/process-user-profiles.ts [--limit N] [--concurrency 8]
 *       [--run-id N] [--usernames a,b] [--single-pass-tokens 500000]
 *       [--chunk-tokens 350000] [--redo] [--dry-run]
 */
import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import OpenAI from "openai";
import postgres from "postgres";
import {
  detransComments,
  detransPosts,
  detransProcessingRuns,
  detransUserProfileChunks,
  detransUserProfiles,
  detransUserTimelines,
} from "../db/schema";

const MODEL = "xiaomi/mimo-v2.6-flash";
const CHARS_PER_TOKEN = 4;

// ── CLI ─────────────────────────────────────────────────────────────────────

interface Options {
  limit: number | null;
  concurrency: number;
  runId: number | null;
  usernames: string[] | null;
  singlePassTokens: number;
  chunkTokens: number;
  maxOutputTokens: number | null;
  redo: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    limit: null,
    concurrency: 8,
    runId: null,
    usernames: null,
    singlePassTokens: 500_000,
    chunkTokens: 350_000,
    maxOutputTokens: null,
    redo: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--limit":
        opts.limit = parseInt(argv[++i] ?? "", 10);
        break;
      case "--concurrency":
        opts.concurrency = parseInt(argv[++i] ?? "", 10);
        break;
      case "--run-id":
        opts.runId = parseInt(argv[++i] ?? "", 10);
        break;
      case "--usernames":
        opts.usernames = (argv[++i] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "--single-pass-tokens":
        opts.singlePassTokens = parseInt(argv[++i] ?? "", 10);
        break;
      case "--chunk-tokens":
        opts.chunkTokens = parseInt(argv[++i] ?? "", 10);
        break;
      case "--max-output-tokens":
        opts.maxOutputTokens = parseInt(argv[++i] ?? "", 10);
        break;
      case "--redo":
        opts.redo = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      default:
        if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!Number.isFinite(opts.concurrency) || opts.concurrency < 1) {
    throw new Error("--concurrency must be >= 1");
  }
  return opts;
}

// ── OpenAI / MiMo client ────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 900_000,
  maxRetries: 0,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 4,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const message = String(err?.message ?? err);
      const retryable =
        status === 429 ||
        (typeof status === "number" && status >= 500) ||
        /timeout|econnreset|etimedout|aborted|overloaded/i.test(message);
      if (attempt >= attempts - 1 || !retryable) throw err;
      const delay =
        Math.min(30_000, 1_000 * 2 ** attempt) + Math.random() * 1_000;
      console.warn(
        `  [retry ${attempt + 1}/${attempts}] ${label}: ${message.slice(0, 140)} (waiting ${Math.round(delay)}ms)`,
      );
      await sleep(delay);
    }
  }
}

function parseJsonLoose(content: string): any {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error(`unparsable JSON: ${trimmed.slice(0, 200)}`);
  }
}

interface CallResult {
  json: any;
  promptTokens: number;
  completionTokens: number;
}

async function callMimo(
  system: string,
  user: string,
  schemaName: string,
  schema: any,
  maxTokens: number,
): Promise<CallResult> {
  const baseParams: any = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
    // OpenRouter-native reasoning kill switch (see chat workflow for context).
    reasoning: { enabled: false, effort: "none" },
    thinking: { type: "disabled" },
  };

  let lastError: any;
  // Two attempts: transient API failures are handled by withRetry; this outer
  // loop re-calls the model when the response is empty or malformed JSON
  // (e.g. truncated output on very long experiences).
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      let response: any;
      try {
        response = await withRetry(
          () =>
            (openai.chat.completions.create as any)({
              ...baseParams,
              response_format: {
                type: "json_schema",
                json_schema: { name: schemaName, strict: true, schema },
              },
            }),
          `mimo ${schemaName}`,
        );
      } catch (err: any) {
        // Some providers reject json_schema; fall back to prompt-only JSON.
        const status = err?.status ?? err?.response?.status;
        if (status !== 400) throw err;
        console.warn(
          `  [fallback] ${schemaName}: json_schema rejected, retrying without response_format`,
        );
        response = await withRetry(
          () => (openai.chat.completions.create as any)(baseParams),
          `mimo ${schemaName} (fallback)`,
        );
      }

      const choice = response?.choices?.[0];
      const content: string = choice?.message?.content ?? "";
      if (!content.trim()) {
        throw new Error(
          `empty response (finish_reason=${choice?.finish_reason ?? "unknown"})`,
        );
      }
      const json = parseJsonLoose(content);
      return {
        json,
        promptTokens: response?.usage?.prompt_tokens ?? 0,
        completionTokens: response?.usage?.completion_tokens ?? 0,
      };
    } catch (err: any) {
      lastError = err;
      const message = String(err?.message ?? err);
      const parseFailure =
        /unparsable JSON|empty response/i.test(message) ||
        err instanceof SyntaxError;
      if (!parseFailure || attempt === 2) throw err;
      console.warn(
        `  [parse retry ${attempt}] ${schemaName}: ${message.slice(0, 140)}`,
      );
    }
  }
  throw lastError;
}

// ── Schemas ─────────────────────────────────────────────────────────────────

const intOrNull = { type: ["integer", "null"] } as const;

const TIMELINE_SCHEMA = {
  type: "object",
  properties: {
    first_dysphoria_age: intOrNull,
    transition_age: intOrNull,
    detransition_age: intOrNull,
    hormones_age: intOrNull,
    top_surgery_age: intOrNull,
    bottom_surgery_age: intOrNull,
    puberty_blockers_age: intOrNull,
    transition_year: intOrNull,
    detransition_year: intOrNull,
    evidence: { type: "array", items: { type: "string" } },
  },
  required: [
    "first_dysphoria_age",
    "transition_age",
    "detransition_age",
    "hormones_age",
    "top_surgery_age",
    "bottom_surgery_age",
    "puberty_blockers_age",
    "transition_year",
    "detransition_year",
    "evidence",
  ],
  additionalProperties: false,
} as const;

const PROFILE_SCHEMA = {
  type: "object",
  properties: {
    experience: { type: "string" },
    summary: { type: "string" },
    sex: { type: "string", enum: ["m", "f"] },
    timeline: TIMELINE_SCHEMA,
  },
  required: ["experience", "summary", "sex", "timeline"],
  additionalProperties: false,
} as const;

const CHUNK_SCHEMA = {
  type: "object",
  properties: {
    narrative: { type: "string" },
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: ["string", "null"] },
          fact: { type: "string" },
          quote: { type: ["string", "null"] },
        },
        required: ["date", "fact", "quote"],
        additionalProperties: false,
      },
    },
    timeline_events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          event: { type: "string" },
          age: intOrNull,
          year: intOrNull,
          evidence: { type: "string" },
        },
        required: ["event", "age", "year", "evidence"],
        additionalProperties: false,
      },
    },
    open_threads: { type: "array", items: { type: "string" } },
  },
  required: ["narrative", "facts", "timeline_events", "open_threads"],
  additionalProperties: false,
} as const;

// ── Prompts ─────────────────────────────────────────────────────────────────

const PROFILE_SYSTEM = `You are a meticulous research assistant who writes detailed, evidence-based first-person accounts of Reddit users from the r/detrans community.

You receive a chronological transcript of the user's own Reddit posts ([POST]) and comments ([COMMENT]) with dates and scores. Write ONLY from the supplied material. Never mention the username or any identifying handle: write entirely in the first person ("I", "my"), as if the person is telling their own story. Never refer to "the subject", "the user", or a name.

Rules:
- Never invent facts. If something is not stated, leave it out of the narrative and leave the relevant timeline field null.
- The person may quote or reply to others. Only attribute experiences to them when the text is clearly their own account. Ignore other people's stories.
- Ages and years: fill a timeline field only when explicit or unambiguously derivable from those facts plus the item dates. Record the reasoning in evidence. Otherwise use null. Never guess.
- sex: biological sex at birth ("m" or "f"). Use explicit statements first; if absent, infer carefully from the transition direction described.
- Language: never use "AMAB"/"AFAB" or "assigned at birth" phrasing — sex is generally observed at birth, not assigned. Write "I was born female/male" or "I am female/male".
- If a difference of sex development (DSD) is described, treat it as a developmental variation of the person's sex; DSDs do not create a spectrum or a third sex.
- Write identity as identification, not essence: "when I identified as trans", "when I lived as a man/woman", not "I was a man/woman". Keep sex and identity clearly distinct.
- experience: a detailed first-person account, roughly 800-1500 words, written as "I ...". Surface as much potentially relevant detail as possible for downstream analysis, wherever the transcript supports it, covering:
  * Identity and timeline: ages/years for first dysphoria, coming out, social transition, hormones, puberty blockers, each surgery, detransition; current identity/status.
  * Causes and contributors: what led to transition (trauma, mental health, neurodivergence/autism/ADHD, internalised homophobia/misogyny/misandry, body dysmorphia, online or peer influence, sexual factors such as AGP/AAP/porn, parental or medical pressure, escapism, fear of sexualisation, etc.).
  * Processes: what moved me toward detransition (therapy that helped or hurt, exposure to detransition communities or role models, research/media, spiritual experience, psychedelics, time off hormones, medical scares, family or partner intervention).
  * Medical: interventions and durations when stated, complications, irreversible changes, fertility concerns, ongoing medical needs.
  * Mental health: conditions, severity, and how it changed after detransition.
  * Adversity: trauma, abuse, assault, bullying, family dysfunction.
  * Social: family support or rejection, relationships, community, ostracism, isolation.
  * Sexuality: before transition, after detransition, internalised homophobia or misogyny.
  * Regret: exactly what I regret (hormones/body changes, top or bottom surgery, voice, fertility, lost time, social losses), how intense it is, and whether it is improving, stable, or worsening over time.
  * Outcomes: current quality of life, body reconciliation, family or career impact, support networks.
  * Attitudes: what I now think about transition for other people (supportive, conditional, critical, opposed), and any advocacy or activism I have done.
  Include concrete specifics (ages, dates, medications, diagnoses, named events) whenever present, and quote key phrases sparingly.
- summary: at most 5 sentences, first person. Always state the final/current identity (e.g. detransitioned woman, desisted, re-transitioned, still identifies as trans, non-binary after detransition, unsure). If the account describes suicidal ideation, self-harm, or suicide attempts since detransitioning, include that. Capture the most important remaining facts faithfully to the narrative.
- timeline: numeric ages/years only. Include an evidence list of short quotes or date references for each non-null value.

Return only JSON matching the provided schema.`;

const CHUNK_SYSTEM = `You are a meticulous research assistant summarising ONE chronological slice of a Reddit user's history (r/detrans posts and comments), written in first person. A later step merges your summary with other slices into a final first-person account, so preserve concrete, quotable detail.

Rules:
- Only use the supplied transcript slice. Never invent facts.
- Never mention the username or any identifying handle; write "I", "my".
- Never use "AMAB"/"AFAB" or "assigned at birth" phrasing: sex is generally observed at birth, not assigned. Treat a described DSD as a developmental variation, not a spectrum or third sex. Write identity as identification ("when I identified as trans"), not essence.
- Only attribute experiences to the subject when the text is clearly their own account (not replies quoting others). Ignore other people's stories.
- narrative: 300-600 words in first person covering this slice.
- facts: up to 60 of the most important facts, each with an approximate date ("2019-04", "2018", or null) and a short verbatim quote when possible. Include causes, processes (therapy, exposure, research), medical details, mental health and suicidality/self-harm, social context, regret specifics, attitudes toward transition for others, and outcomes wherever present.
- timeline_events: dated/aged transition milestones (first dysphoria, coming out, hormones, surgeries, detransition, etc.) with the age/year if stated or unambiguously derivable, plus the supporting evidence.
- open_threads: unresolved references or facts that likely connect to earlier/later slices (e.g. "partner mentioned but not named", "later surgery implied").
Return only JSON matching the provided schema.`;

function buildProfileUserPrompt(
  transcript: string,
  counts: { comments: number; posts: number },
): string {
  return `ITEMS: ${counts.comments} comments, ${counts.posts} posts

TRANSCRIPT (chronological):
${transcript}`;
}

function buildChunkUserPrompt(
  chunkIndex: number,
  chunkCount: number,
  dateStart: string,
  dateEnd: string,
  storySoFar: string,
  transcript: string,
): string {
  return `SLICE ${chunkIndex + 1} of ${chunkCount} (${dateStart} to ${dateEnd})
${storySoFar ? `\nSTORY SO FAR (previous slice summary):\n${storySoFar}\n` : ""}
TRANSCRIPT SLICE:
${transcript}`;
}

function buildReduceUserPrompt(
  chunkSummaries: string,
  counts: { comments: number; posts: number },
): string {
  return `ITEMS: ${counts.comments} comments, ${counts.posts} posts
The history was split into chronological slices. Below are the structured summaries of every slice, in order. Merge them into the final first-person account.

SLICE SUMMARIES:
${chunkSummaries}`;
}

// ── Item loading ────────────────────────────────────────────────────────────

interface Item {
  date: Date;
  type: "POST" | "COMMENT";
  score: number | null;
  text: string;
  chars: number;
}

async function loadUserItems(
  db: any,
  username: string,
): Promise<{ items: Item[]; comments: number; posts: number }> {
  const comments = await db
    .select({
      text: detransComments.text,
      created: detransComments.created,
      score: detransComments.score,
    })
    .from(detransComments)
    .where(
      and(
        eq(detransComments.username, username),
        sql`trim(${detransComments.text}) NOT IN ('[removed]', '[deleted]')`,
      ),
    )
    .orderBy(detransComments.created);

  const posts = await db
    .select({
      title: detransPosts.title,
      text: detransPosts.text,
      created: detransPosts.created,
      score: detransPosts.score,
    })
    .from(detransPosts)
    .where(eq(detransPosts.username, username))
    .orderBy(detransPosts.created);

  const items: Item[] = [];
  for (const c of comments) {
    const text = (c.text ?? "").trim();
    if (!text) continue;
    items.push({
      date: c.created,
      type: "COMMENT",
      score: c.score,
      text,
      chars: text.length,
    });
  }
  for (const p of posts) {
    const title = (p.title ?? "").trim();
    const body = (p.text ?? "").trim();
    const text = title ? `${title}${body ? `\n\n${body}` : ""}` : body;
    if (!text) continue;
    items.push({
      date: p.created,
      type: "POST",
      score: p.score,
      text,
      chars: text.length,
    });
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime());
  return { items, comments: comments.length, posts: posts.length };
}

function formatItem(item: Item): string {
  const date = item.date.toISOString().slice(0, 10);
  const score = item.score == null ? "" : ` score=${item.score}`;
  return `[${date}] [${item.type}${score}] ${item.text}`;
}

const estimateTokens = (chars: number) => Math.ceil(chars / CHARS_PER_TOKEN);

function chunkItems(items: Item[], chunkTokens: number): Item[][] {
  const chunks: Item[][] = [];
  let current: Item[] = [];
  let currentTokens = 0;
  for (const item of items) {
    const itemTokens = estimateTokens(item.chars) + 20; // header overhead
    if (current.length > 0 && currentTokens + itemTokens > chunkTokens) {
      chunks.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(item);
    currentTokens += itemTokens;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// ── Main processing ─────────────────────────────────────────────────────────

interface UserResult {
  username: string;
  ok: boolean;
  chunks: number;
  chars: number;
  promptTokens: number;
  completionTokens: number;
  seconds: number;
  error?: string;
}

async function processUser(
  db: any,
  opts: Options,
  runId: number,
  username: string,
): Promise<UserResult> {
  const started = Date.now();
  const { items, comments, posts } = await loadUserItems(db, username);
  const totalChars = items.reduce((sum, i) => sum + i.chars, 0);
  const totalTokens = estimateTokens(totalChars);
  let promptTokens = 0;
  let completionTokens = 0;

  if (items.length === 0) {
    return {
      username,
      ok: false,
      chunks: 0,
      chars: 0,
      promptTokens: 0,
      completionTokens: 0,
      seconds: 0,
      error: "no items",
    };
  }

  let profile: any;
  let chunkCount = 0;

  if (totalTokens <= opts.singlePassTokens) {
    const transcript = items.map(formatItem).join("\n");
    const result = await callMimo(
      PROFILE_SYSTEM,
      buildProfileUserPrompt(transcript, { comments, posts }),
      "profile",
      PROFILE_SCHEMA,
      opts.maxOutputTokens ?? 9000,
    );
    profile = result.json;
    promptTokens += result.promptTokens;
    completionTokens += result.completionTokens;
  } else {
    // Map-reduce.
    const chunks = chunkItems(items, opts.chunkTokens);
    chunkCount = chunks.length;
    const summaries: string[] = [];
    let storySoFar = "";
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const transcript = chunk.map(formatItem).join("\n");
      const dateStart = chunk[0].date.toISOString().slice(0, 10);
      const dateEnd = chunk[chunk.length - 1].date.toISOString().slice(0, 10);
      const result = await callMimo(
        CHUNK_SYSTEM,
        buildChunkUserPrompt(
          i,
          chunks.length,
          dateStart,
          dateEnd,
          storySoFar,
          transcript,
        ),
        "slice_summary",
        CHUNK_SCHEMA,
        opts.maxOutputTokens ?? 8000,
      );
      promptTokens += result.promptTokens;
      completionTokens += result.completionTokens;
      summaries.push(JSON.stringify(result.json));
      storySoFar = String(result.json?.narrative ?? "").slice(0, 3000);
      if (!opts.dryRun) {
        await db
          .insert(detransUserProfileChunks)
          .values({
            runId,
            username,
            chunkIndex: i,
            dateStart: chunk[0].date,
            dateEnd: chunk[chunk.length - 1].date,
            itemCount: chunk.length,
            charCount: chunk.reduce((s, it) => s + it.chars, 0),
            summary: result.json,
          })
          .onConflictDoUpdate({
            target: [
              detransUserProfileChunks.runId,
              detransUserProfileChunks.username,
              detransUserProfileChunks.chunkIndex,
            ],
            set: { summary: sql`excluded.summary` },
          });
      }
    }

    const reduceResult = await callMimo(
      PROFILE_SYSTEM,
      buildReduceUserPrompt(
        summaries.map((s, i) => `--- Slice ${i + 1} ---\n${s}`).join("\n\n"),
        { comments, posts },
      ),
      "profile",
      PROFILE_SCHEMA,
      opts.maxOutputTokens ?? 9000,
    );
    profile = reduceResult.json;
    promptTokens += reduceResult.promptTokens;
    completionTokens += reduceResult.completionTokens;
  }

  const timeline = profile?.timeline ?? {};
  const toInt = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;

  if (!opts.dryRun) {
    const profileValues = {
      runId,
      username,
      experience: String(profile?.experience ?? "") || null,
      experienceSummary: String(profile?.summary ?? "") || null,
      sex: profile?.sex === "m" || profile?.sex === "f" ? profile.sex : null,
      commentCount: comments,
      postCount: posts,
      charCount: totalChars,
      chunkCount,
      firstItemDate: items[0]?.date ?? null,
      model: MODEL,
    };
    await db
      .insert(detransUserProfiles)
      .values(profileValues)
      .onConflictDoUpdate({
        target: [detransUserProfiles.runId, detransUserProfiles.username],
        set: {
          experience: sql`excluded.experience`,
          experienceSummary: sql`excluded.experience_summary`,
          redFlagsReport: sql`excluded.red_flags_report`,
          sex: sql`excluded.sex`,
          commentCount: sql`excluded.comment_count`,
          postCount: sql`excluded.post_count`,
          charCount: sql`excluded.char_count`,
          chunkCount: sql`excluded.chunk_count`,
          firstItemDate: sql`excluded.first_item_date`,
          model: sql`excluded.model`,
        },
      });

    const timelineValues = {
      runId,
      username,
      firstDysphoriaAge: toInt(timeline.first_dysphoria_age),
      transitionAge: toInt(timeline.transition_age),
      detransitionAge: toInt(timeline.detransition_age),
      hormonesAge: toInt(timeline.hormones_age),
      topSurgeryAge: toInt(timeline.top_surgery_age),
      bottomSurgeryAge: toInt(timeline.bottom_surgery_age),
      pubertyBlockersAge: toInt(timeline.puberty_blockers_age),
      transitionYear: toInt(timeline.transition_year),
      detransitionYear: toInt(timeline.detransition_year),
      timeline,
    };
    await db
      .insert(detransUserTimelines)
      .values(timelineValues)
      .onConflictDoUpdate({
        target: [detransUserTimelines.runId, detransUserTimelines.username],
        set: {
          firstDysphoriaAge: sql`excluded.first_dysphoria_age`,
          transitionAge: sql`excluded.transition_age`,
          detransitionAge: sql`excluded.detransition_age`,
          hormonesAge: sql`excluded.hormones_age`,
          topSurgeryAge: sql`excluded.top_surgery_age`,
          bottomSurgeryAge: sql`excluded.bottom_surgery_age`,
          pubertyBlockersAge: sql`excluded.puberty_blockers_age`,
          transitionYear: sql`excluded.transition_year`,
          detransitionYear: sql`excluded.detransition_year`,
          timeline: sql`excluded.timeline`,
        },
      });
  }

  return {
    username,
    ok: true,
    chunks: chunkCount,
    chars: totalChars,
    promptTokens,
    completionTokens,
    seconds: (Date.now() - started) / 1000,
  };
}

// ── Cohort ──────────────────────────────────────────────────────────────────

async function getCohort(db: any): Promise<string[]> {
  const result: any = await db.execute(sql`
    SELECT username FROM detrans_comments
    WHERE username IS NOT NULL AND username <> '[deleted]'
      AND trim(text) NOT IN ('[removed]', '[deleted]') AND score >= 3
    GROUP BY username
    HAVING count(*) >= 5
    ORDER BY count(*) DESC
  `);
  const rows: any[] = result?.rows ?? result;
  return rows.map((r) => r.username as string);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: opts.concurrency + 4 });
  const db = drizzle(client);

  console.log("=== Profile generation (MiMo v2.6 Flash) ===");

  // Resolve run.
  let runId = opts.runId;
  if (!runId) {
    if (opts.dryRun) {
      runId = -1;
    } else {
      const [run] = await db
        .insert(detransProcessingRuns)
        .values({ kind: "profiles", model: MODEL })
        .returning({ id: detransProcessingRuns.id });
      runId = run.id;
    }
  }
  console.log(`Run:              ${runId}${opts.dryRun ? " (dry run)" : ""}`);
  console.log(`Concurrency:      ${opts.concurrency}`);
  console.log(
    `Single pass <=    ${opts.singlePassTokens.toLocaleString()} tokens`,
  );
  console.log(`Chunk target:     ${opts.chunkTokens.toLocaleString()} tokens`);

  // Cohort + resume filtering.
  let usernames = opts.usernames ?? (await getCohort(db));
  if (opts.usernames && opts.usernames.length > 0) {
    // keep only real cohort members unless explicitly dry-running
    const cohort = new Set(await getCohort(db));
    usernames = usernames.filter((u) => cohort.has(u));
  }

  if (!opts.redo && !opts.dryRun && runId > 0) {
    const done: any = await db.execute(
      sql`SELECT username FROM detrans_user_profiles WHERE run_id = ${runId}`,
    );
    const doneRows: any[] = done?.rows ?? done;
    const doneSet = new Set(doneRows.map((r) => r.username as string));
    usernames = usernames.filter((u) => !doneSet.has(u));
  }

  if (opts.limit) usernames = usernames.slice(0, opts.limit);
  console.log(`Users to process: ${usernames.length}`);
  console.log();

  const started = Date.now();
  let processed = 0;
  let failed = 0;
  let chunkedUsers = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  const failures: { username: string; error: string }[] = [];

  // Simple worker pool.
  let next = 0;
  const workers = Array.from({ length: opts.concurrency }, async () => {
    while (true) {
      const index = next++;
      if (index >= usernames.length) return;
      const username = usernames[index];
      try {
        const result = await processUser(db, opts, runId, username);
        processed++;
        chunkedUsers += result.chunks > 0 ? 1 : 0;
        totalPromptTokens += result.promptTokens;
        totalCompletionTokens += result.completionTokens;
        if (processed % 10 === 0 || processed <= 5 || opts.usernames) {
          console.log(
            `  [${processed + failed}/${usernames.length}] ${username} ` +
              `(${Math.round(result.chars / 1000)}k chars, ${result.chunks ? `${result.chunks} chunk(s), ` : ""}` +
              `${result.seconds.toFixed(0)}s)`,
          );
        }
      } catch (err: any) {
        failed++;
        const message = String(err?.message ?? err).slice(0, 300);
        failures.push({ username, error: message });
        console.error(`  [fail] ${username}: ${message}`);
      }
    }
  });
  await Promise.all(workers);

  const elapsed = (Date.now() - started) / 1000;
  const stats = {
    processed,
    failed,
    chunkedUsers,
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    elapsedSeconds: Math.round(elapsed),
    failures,
  };

  if (!opts.dryRun && runId > 0) {
    await db
      .update(detransProcessingRuns)
      .set({ finishedAt: new Date(), stats })
      .where(eq(detransProcessingRuns.id, runId));
  }

  console.log();
  console.log("=== Summary ===");
  console.log(`Processed: ${processed}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Chunked:   ${chunkedUsers}`);
  console.log(
    `Tokens:    ${totalPromptTokens.toLocaleString()} in / ${totalCompletionTokens.toLocaleString()} out`,
  );
  console.log(`Elapsed:   ${(elapsed / 60).toFixed(1)} min`);
  if (failures.length > 0) {
    console.log(
      `Failures:  ${failures
        .slice(0, 10)
        .map((f) => f.username)
        .join(", ")}${failures.length > 10 ? "…" : ""}`,
    );
  }
  if (opts.dryRun) console.log("(dry run — nothing written)");

  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
