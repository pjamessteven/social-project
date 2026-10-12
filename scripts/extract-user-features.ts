#!/usr/bin/env tsx
/**
 * Extract user features with Jev (TypeSafe System One) via OpenRouter.
 *
 * Reads profiles + timelines from a profiles run and sends ONE System One
 * request per user: the state is the compact profile (summary, experience,
 * authenticity report, timeline) and the questions are the full canonical
 * taxonomy from detrans_features.
 *
 * Raw answers (noul probabilities, choice/score distributions + confidence)
 * are stored in detrans_user_features so tag thresholds can be re-tuned later
 * without re-calling Jev.
 *
 * Usage:
 *   npx tsx scripts/extract-user-features.ts --profiles-run-id 1
 *       [--run-id 2] [--concurrency 8] [--limit N] [--usernames a,b]
 *       [--features key1,key2] [--redo]
 */
import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { TAXONOMY_VERSION } from "../app/lib/feature-taxonomy";
import {
  detransFeatures,
  detransProcessingRuns,
  detransUserFeatures,
  detransUserProfiles,
  detransUserTimelines,
} from "../db/schema";

const JEV_URL = "https://openrouter.ai/api/v1/systemone";
const JEV_MODEL = "typesafe/jev-1.13";
const MAX_STATE_TOKENS = 20_000;
const CHARS_PER_TOKEN = 4;

// ── CLI ─────────────────────────────────────────────────────────────────────

interface Options {
  profilesRunId: number;
  runId: number | null;
  concurrency: number;
  limit: number | null;
  usernames: string[] | null;
  features: string[] | null;
  redo: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    profilesRunId: 0,
    runId: null,
    concurrency: 8,
    limit: null,
    usernames: null,
    features: null,
    redo: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--profiles-run-id":
        opts.profilesRunId = parseInt(argv[++i] ?? "", 10);
        break;
      case "--run-id":
        opts.runId = parseInt(argv[++i] ?? "", 10);
        break;
      case "--concurrency":
        opts.concurrency = parseInt(argv[++i] ?? "", 10);
        break;
      case "--limit":
        opts.limit = parseInt(argv[++i] ?? "", 10);
        break;
      case "--usernames":
        opts.usernames = (argv[++i] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "--features":
        opts.features = (argv[++i] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "--redo":
        opts.redo = true;
        break;
      default:
        if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!opts.profilesRunId) {
    throw new Error("--profiles-run-id is required");
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
        status === 529 ||
        (typeof status === "number" && status >= 500) ||
        /timeout|econnreset|etimedout|fetch failed/i.test(message);
      if (attempt >= attempts - 1 || !retryable) throw err;
      const delay =
        err?.retryAfterMs ??
        Math.min(30_000, 1_000 * 2 ** attempt) + Math.random() * 1_000;
      console.warn(
        `  [retry ${attempt + 1}/${attempts}] ${label}: ${message.slice(0, 140)} (waiting ${Math.round(delay)}ms)`,
      );
      await sleep(delay);
    }
  }
}

interface JevResponse {
  answers: Record<string, any>;
  cost: number;
  inputTokens: number;
}

async function callJev(
  apiKey: string,
  state: unknown,
  questions: Record<string, unknown>,
): Promise<JevResponse> {
  return withRetry(async () => {
    const res = await fetch(JEV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: JEV_MODEL, state, questions }),
      signal: AbortSignal.timeout(120_000),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      const err: any = new Error(
        `Jev ${res.status}: ${bodyText.slice(0, 300)}`,
      );
      err.status = res.status;
      const retryAfter = Number(res.headers.get("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        err.retryAfterMs = retryAfter * 1000;
      }
      throw err;
    }
    const parsed = JSON.parse(bodyText);
    return {
      answers: parsed.answers ?? {},
      cost: parsed.usage?.cost ?? 0,
      inputTokens: parsed.usage?.input_tokens ?? 0,
    };
  }, "jev");
}

function truncate(text: string | null | undefined, maxChars: number): string {
  if (!text) return "";
  return text.length > maxChars
    ? `${text.slice(0, maxChars)}…[truncated]`
    : text;
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

  console.log("=== Feature extraction (Jev System One) ===");
  console.log(`Profiles run: ${opts.profilesRunId}`);
  console.log(`Concurrency:  ${opts.concurrency}`);

  // Load taxonomy from DB (seeded by scripts/seed-features.ts).
  const allFeatures = await db
    .select()
    .from(detransFeatures)
    .where(eq(detransFeatures.enabled, true));
  if (allFeatures.length === 0) {
    throw new Error(
      "No enabled features found — run scripts/seed-features.ts first",
    );
  }
  let features = allFeatures;
  if (opts.features && opts.features.length > 0) {
    const wanted = new Set(opts.features);
    features = allFeatures.filter((f) => wanted.has(f.key));
    const missing = [...wanted].filter(
      (key) => !allFeatures.some((f) => f.key === key),
    );
    if (missing.length > 0) {
      throw new Error(`Unknown feature keys: ${missing.join(", ")}`);
    }
  }
  const featureIdByKey = new Map(features.map((f) => [f.key, f.id]));
  const questions: Record<string, unknown> = {};
  for (const f of features) {
    questions[f.key] = f.question;
  }
  console.log(`Questions per request: ${features.length}`);

  // Create or resume the features run.
  let runId = opts.runId;
  if (!runId) {
    const [run] = await db
      .insert(detransProcessingRuns)
      .values({
        kind: "features",
        model: JEV_MODEL,
        taxonomyVersion: String(TAXONOMY_VERSION),
        notes: `profiles_run_id=${opts.profilesRunId}`,
      })
      .returning({ id: detransProcessingRuns.id });
    runId = run.id;
  }
  console.log(`Run:          ${runId}`);
  console.log();

  // Load profiles + timelines joined on username.
  const profiles = await db
    .select({
      username: detransUserProfiles.username,
      experience: detransUserProfiles.experience,
      summary: detransUserProfiles.experienceSummary,
      sex: detransUserProfiles.sex,
      timeline: detransUserTimelines.timeline,
      transitionAge: detransUserTimelines.transitionAge,
      detransitionAge: detransUserTimelines.detransitionAge,
      hormonesAge: detransUserTimelines.hormonesAge,
      topSurgeryAge: detransUserTimelines.topSurgeryAge,
      bottomSurgeryAge: detransUserTimelines.bottomSurgeryAge,
      pubertyBlockersAge: detransUserTimelines.pubertyBlockersAge,
      firstDysphoriaAge: detransUserTimelines.firstDysphoriaAge,
      transitionYear: detransUserTimelines.transitionYear,
      detransitionYear: detransUserTimelines.detransitionYear,
    })
    .from(detransUserProfiles)
    .leftJoin(
      detransUserTimelines,
      and(
        eq(detransUserTimelines.runId, detransUserProfiles.runId),
        eq(detransUserTimelines.username, detransUserProfiles.username),
      ),
    )
    .where(eq(detransUserProfiles.runId, opts.profilesRunId));

  let users = profiles;
  if (opts.usernames && opts.usernames.length > 0) {
    const wanted = new Set(opts.usernames);
    users = users.filter((p) => wanted.has(p.username));
  }

  if (!opts.redo) {
    // Only treat a user as done once every selected question has an answer.
    const done = await db
      .select({ username: detransUserFeatures.username })
      .from(detransUserFeatures)
      .where(eq(detransUserFeatures.runId, runId))
      .groupBy(detransUserFeatures.username)
      .having(sql`count(*) = ${features.length}`);
    const doneSet = new Set(done.map((d) => d.username));
    users = users.filter((u) => !doneSet.has(u.username));
  }
  if (opts.limit) users = users.slice(0, opts.limit);
  console.log(`Users to process: ${users.length}`);
  console.log();

  const started = Date.now();
  let processed = 0;
  let failed = 0;
  let totalCost = 0;
  let totalInputTokens = 0;
  const failures: { username: string; error: string }[] = [];

  let next = 0;
  const workers = Array.from({ length: opts.concurrency }, async () => {
    while (true) {
      const index = next++;
      if (index >= users.length) return;
      const user = users[index];
      try {
        // Build the state, trimming the experience report if needed.
        let experienceChars = 30_000;
        let state: any;
        do {
          state = {
            note: "This is a first-person account written by the person being evaluated; 'I' refers to them.",
            summary: user.summary,
            experience: truncate(user.experience, experienceChars),
            timeline: {
              first_dysphoria_age: user.firstDysphoriaAge,
              transition_age: user.transitionAge,
              detransition_age: user.detransitionAge,
              hormones_age: user.hormonesAge,
              top_surgery_age: user.topSurgeryAge,
              bottom_surgery_age: user.bottomSurgeryAge,
              puberty_blockers_age: user.pubertyBlockersAge,
              transition_year: user.transitionYear,
              detransition_year: user.detransitionYear,
            },
            sex_at_birth: user.sex,
          };
          const stateTokens = Math.ceil(
            JSON.stringify(state).length / CHARS_PER_TOKEN,
          );
          if (stateTokens <= MAX_STATE_TOKENS) break;
          experienceChars = Math.floor(experienceChars * 0.7);
          if (experienceChars < 500) {
            state.experience = "";
            break;
          }
        } while (true);

        const response = await callJev(apiKey, state, questions);
        totalCost += response.cost;
        totalInputTokens += response.inputTokens;

        const rows = [];
        for (const [key, answer] of Object.entries(response.answers)) {
          const featureId = featureIdByKey.get(key);
          if (!featureId || !answer || typeof answer !== "object") continue;
          const kind = (answer as any).type ?? null;
          rows.push({
            runId,
            username: user.username,
            featureId,
            kind,
            noul:
              typeof (answer as any).noul === "number"
                ? (answer as any).noul
                : null,
            score:
              typeof (answer as any).score === "number"
                ? (answer as any).score
                : null,
            choice:
              typeof (answer as any).choice === "string"
                ? (answer as any).choice
                : null,
            confidence:
              typeof (answer as any).confidence === "number"
                ? (answer as any).confidence
                : null,
            probabilities: (answer as any).probabilities ?? null,
          });
        }

        if (rows.length > 0) {
          await db
            .insert(detransUserFeatures)
            .values(rows)
            .onConflictDoUpdate({
              target: [
                detransUserFeatures.runId,
                detransUserFeatures.username,
                detransUserFeatures.featureId,
              ],
              set: {
                kind: sql`excluded.kind`,
                noul: sql`excluded.noul`,
                score: sql`excluded.score`,
                choice: sql`excluded.choice`,
                confidence: sql`excluded.confidence`,
                probabilities: sql`excluded.probabilities`,
              },
            });
        }

        processed++;
        if (processed % 10 === 0 || processed <= 5 || opts.usernames) {
          console.log(
            `  [${processed + failed}/${users.length}] ${user.username} (${rows.length}/${features.length} answers)`,
          );
        }
      } catch (err: any) {
        failed++;
        const message = String(err?.message ?? err).slice(0, 300);
        failures.push({ username: user.username, error: message });
        console.error(`  [fail] ${user.username}: ${message}`);
      }
    }
  });
  await Promise.all(workers);

  const elapsed = (Date.now() - started) / 1000;
  const stats = {
    processed,
    failed,
    inputTokens: totalInputTokens,
    costUSD: totalCost,
    elapsedSeconds: Math.round(elapsed),
    failures,
  };
  await db
    .update(detransProcessingRuns)
    .set({ finishedAt: new Date(), stats })
    .where(eq(detransProcessingRuns.id, runId));

  console.log();
  console.log("=== Summary ===");
  console.log(`Processed: ${processed}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Tokens in: ${totalInputTokens.toLocaleString()}`);
  console.log(`Cost:      $${totalCost.toFixed(4)}`);
  console.log(`Elapsed:   ${(elapsed / 60).toFixed(1)} min`);
  if (failures.length > 0) {
    console.log(
      `Failures:  ${failures
        .slice(0, 10)
        .map((f) => f.username)
        .join(", ")}${failures.length > 10 ? "…" : ""}`,
    );
  }

  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
