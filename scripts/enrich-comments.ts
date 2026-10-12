#!/usr/bin/env tsx
/**
 * Enrich detrans comments for the chat RAG index (summary / questions / keywords).
 *
 * Recreates the fields the old (deleted) enrichment pipeline produced, so the
 * re-embedding pass can build the same `default_v2` named vectors
 * (questions + summary) with the same payload shape.
 *
 * Uses MiMo v2.6 Flash via OpenRouter only. Groups several comments per LLM
 * request (default 4) for throughput, with a per-comment fallback when a group
 * response is unusable. Resumable via the `enriched` flag — safe to kill and
 * re-run at any time.
 *
 * Usage:
 *   npx tsx scripts/enrich-comments.ts [--concurrency 16] [--group 4]
 *       [--limit N] [--batch 200] [--min-chars 15] [--dry-run]
 */
import "dotenv/config";
import { and, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import OpenAI from "openai";
import postgres from "postgres";
import { detransComments } from "../db/schema";

const MODEL = "xiaomi/mimo-v2.6-flash";

// ── CLI ─────────────────────────────────────────────────────────────────────

interface Options {
  concurrency: number;
  group: number;
  limit: number | null;
  batch: number;
  minChars: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    concurrency: 16,
    group: 4,
    limit: null,
    batch: 200,
    minChars: 15,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--concurrency":
        opts.concurrency = parseInt(argv[++i] ?? "", 10);
        break;
      case "--group":
        opts.group = Math.max(1, parseInt(argv[++i] ?? "", 10));
        break;
      case "--limit":
        opts.limit = parseInt(argv[++i] ?? "", 10);
        break;
      case "--batch":
        opts.batch = parseInt(argv[++i] ?? "", 10);
        break;
      case "--min-chars":
        opts.minChars = parseInt(argv[++i] ?? "", 10);
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      default:
        if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    }
  }
  return opts;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 5,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status;
      const message = String(err?.message ?? err);
      const retryable =
        status === 429 ||
        (typeof status === "number" && status >= 500) ||
        /timeout|econnreset|etimedout|fetch failed|socket hang up/i.test(
          message,
        );
      if (attempt >= attempts - 1 || !retryable) throw err;
      const delay = Math.min(30_000, 800 * 2 ** attempt) + Math.random() * 500;
      console.warn(
        `  [retry ${attempt + 1}/${attempts}] ${label}: ${message.slice(0, 120)}`,
      );
      await sleep(delay);
    }
  }
}

interface Row {
  uuid: string;
  text: string;
  username: string | null;
  userFlair: string | null;
}

interface Enrichment {
  summary: string;
  questions: string[];
  keywords: string[];
}

function extractJson(raw: string): any {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start)
    throw new Error("no JSON object");
  return JSON.parse(raw.slice(start, end + 1));
}

function normalize(username: string | null, parsed: any): Enrichment {
  const who = username ? `Reddit user ${username}` : "A Reddit user";
  let summary = String(parsed.summary ?? "").trim();
  if (!summary) throw new Error("empty summary");
  if (!/^reddit user /i.test(summary) && !/^a reddit user/i.test(summary)) {
    summary = `${who}: ${summary}`;
  }
  if (summary.length > 700) summary = `${summary.slice(0, 697)}...`;

  const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
    .map((q: unknown) => String(q).trim().replace(/\?+$/, ""))
    .filter((q: string) => q.length > 5)
    .slice(0, 6);
  if (questions.length === 0) throw new Error("no questions");

  const keywords = (Array.isArray(parsed.keywords) ? parsed.keywords : [])
    .map((k: unknown) => String(k).trim().toLowerCase().replace(/[".]/g, ""))
    .filter((k: string) => k.length > 1 && k.length < 40)
    .slice(0, 12);
  if (keywords.length === 0) throw new Error("no keywords");

  return { summary, questions, keywords };
}

function groupPrompt(rows: Row[]): string {
  const blocks = rows.map((row, i) => {
    const who = row.username ? `Reddit user ${row.username}` : "A Reddit user";
    const flair = row.userFlair ? ` (flair: ${row.userFlair})` : "";
    return `--- Comment ${i + 1} ---
Author: ${who}${flair}
Text:
"""
${row.text.slice(0, 2500)}
"""`;
  });

  return `You are preparing Reddit comments for a semantic search index about gender detransition.
For EACH of the ${rows.length} comments below, produce:
- summary: ONE concise sentence, third person, beginning with the author's name as given ("Reddit user X ..." or "A Reddit user ..."). No first person, no quotes.
- questions: exactly 3 natural questions that this specific comment can answer.
- keywords: 5-8 short lowercase topical keywords (no usernames, no punctuation).

Return STRICT JSON only, no markdown, exactly:
{"results":[{"index":1,"summary":"...","questions":["...","...","..."],"keywords":["...","..."]}, ...]}

${blocks.join("\n\n")}`;
}

async function chat(openai: OpenAI, prompt: string, maxTokens: number) {
  const response: any = await withRetry(
    () =>
      (openai.chat.completions.create as any)({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: maxTokens,
        // OpenRouter-native reasoning kill switch (see process-user-profiles.ts).
        reasoning: { enabled: false, effort: "none" },
        thinking: { type: "disabled" },
      }),
    "enrich",
  );
  const content: string = response?.choices?.[0]?.message?.content ?? "";
  const promptTokens = response?.usage?.prompt_tokens ?? 0;
  const completionTokens = response?.usage?.completion_tokens ?? 0;
  return { content, promptTokens, completionTokens };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error("OPENROUTER_KEY is not set");

  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: opts.concurrency + 4 });
  const db = drizzle(client);
  const openai = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const eligibleFilter = and(
    gte(detransComments.score, 3),
    eq(detransComments.enriched, false),
    sql`trim(${detransComments.text}) NOT IN ('[removed]', '[deleted]')`,
    sql`length(trim(${detransComments.text})) >= ${opts.minChars}`,
  );

  const [{ count: totalEligible }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(detransComments)
    .where(eligibleFilter);

  console.log("=== Comment enrichment (summary/questions/keywords) ===");
  console.log(`Model:        ${MODEL} (OpenRouter)`);
  console.log(
    `Concurrency:  ${opts.concurrency} x ${opts.group} comments/request`,
  );
  console.log(`Eligible:     ${totalEligible} comments`);
  console.log(`Mode:         ${opts.dryRun ? "DRY RUN" : "write"}`);
  console.log();

  let processed = 0;
  let failed = 0;
  let fallbackCalls = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let lastUuid: string | null = null;
  const started = Date.now();

  const persist = async (row: Row, enriched: Enrichment) => {
    await db
      .update(detransComments)
      .set({
        summary: enriched.summary,
        questions: `QUESTIONS: ${enriched.questions.map((q) => `${q}?`).join(" ")}`,
        keywords: enriched.keywords.join(", "),
        enriched: true,
      })
      .where(eq(detransComments.uuid, row.uuid));
  };

  while (true) {
    if (opts.limit && processed >= opts.limit) break;

    const rows: Row[] = await db
      .select({
        uuid: detransComments.uuid,
        text: detransComments.text,
        username: detransComments.username,
        userFlair: detransComments.userFlair,
      })
      .from(detransComments)
      .where(
        and(
          eligibleFilter,
          lastUuid ? sql`${detransComments.uuid} > ${lastUuid}` : undefined,
        ),
      )
      .orderBy(detransComments.uuid)
      .limit(
        Math.min(
          opts.batch,
          opts.limit ? Math.max(0, opts.limit - processed) : opts.batch,
        ),
      );

    if (rows.length === 0) break;

    const groups: Row[][] = [];
    for (let i = 0; i < rows.length; i += opts.group) {
      groups.push(rows.slice(i, i + opts.group));
    }

    let next = 0;
    const workers = Array.from({ length: opts.concurrency }, async () => {
      while (true) {
        const index = next++;
        if (index >= groups.length) return;
        const group = groups[index];

        const resolved = new Map<string, Enrichment>();
        try {
          const { content, promptTokens, completionTokens } = await chat(
            openai,
            groupPrompt(group),
            300 + 500 * group.length,
          );
          totalPromptTokens += promptTokens;
          totalCompletionTokens += completionTokens;
          const parsed = extractJson(content.replace(/```(?:json)?/gi, ""));
          const results = Array.isArray(parsed?.results) ? parsed.results : [];
          // 1) map by explicit index when the model provides one
          for (const r of results) {
            const idx = Number(r?.index) - 1;
            const row = group[idx];
            if (!row) continue;
            try {
              resolved.set(row.uuid, normalize(row.username, r));
            } catch {
              // fall through to order-based mapping / per-comment fallback
            }
          }
          // 2) if the model returned the same number of results, map by order
          if (results.length === group.length) {
            group.forEach((row, i) => {
              if (resolved.has(row.uuid)) return;
              try {
                resolved.set(row.uuid, normalize(row.username, results[i]));
              } catch {
                // fall through to per-comment fallback
              }
            });
          }
        } catch (err: any) {
          console.error(
            `  [group-fail] ${String(err?.message ?? err).slice(0, 140)}`,
          );
        }

        for (const row of group) {
          if (resolved.has(row.uuid)) {
            if (!opts.dryRun) await persist(row, resolved.get(row.uuid)!);
            processed++;
            continue;
          }
          // per-comment fallback
          try {
            fallbackCalls++;
            const { content, promptTokens, completionTokens } = await chat(
              openai,
              groupPrompt([row]),
              600,
            );
            totalPromptTokens += promptTokens;
            totalCompletionTokens += completionTokens;
            const parsed = extractJson(content.replace(/```(?:json)?/gi, ""));
            const r = Array.isArray(parsed?.results)
              ? parsed.results[0]
              : parsed;
            const enriched = normalize(row.username, r);
            if (!opts.dryRun) await persist(row, enriched);
            processed++;
          } catch (err: any) {
            failed++;
            console.error(
              `  [fail] ${row.uuid}: ${String(err?.message ?? err).slice(0, 140)}`,
            );
          }
        }

        if (processed > 0 && processed % 200 < opts.group) {
          const elapsedMin = (Date.now() - started) / 60000;
          const rate = processed / Math.max(elapsedMin, 0.01);
          const remaining = totalEligible - processed - failed;
          console.log(
            `  ${processed}/${totalEligible} enriched (${rate.toFixed(0)}/min, ~${(remaining / Math.max(rate, 1)).toFixed(0)} min left) | failed: ${failed} | fallbacks: ${fallbackCalls}`,
          );
        }
      }
    });
    await Promise.all(workers);
    lastUuid = rows[rows.length - 1].uuid;
  }

  console.log();
  console.log("=== Summary ===");
  console.log(`Enriched:  ${processed}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Fallbacks: ${fallbackCalls}`);
  console.log(
    `Tokens:    ${totalPromptTokens.toLocaleString()} in / ${totalCompletionTokens.toLocaleString()} out`,
  );
  console.log(`Elapsed:   ${((Date.now() - started) / 60000).toFixed(1)} min`);
  if (opts.dryRun) console.log("(dry run — nothing written)");
  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
