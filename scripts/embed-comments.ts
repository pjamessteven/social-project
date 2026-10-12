#!/usr/bin/env tsx
/**
 * Embed enriched detrans comments into Qdrant `default_v2` for chat RAG.
 *
 * Mirrors scripts/rembed-comments-named-vectors.ts exactly:
 *   * named vectors `questions` + `summary` (text-embedding-3-large, 3072 dims)
 *     and `combined` (full text) so points match the existing collection shape
 *   * LlamaIndex-compatible payload (_node_content, sectionSummary, ...)
 *   * point id = detrans_comments.uuid (deterministic UUIDv5 — idempotent upserts)
 *
 * Selection: score >= 3, enriched, not yet embedded. Resumable via `embedded`.
 *
 * Usage:
 *   npx tsx scripts/embed-comments.ts [--batch 50] [--limit N] [--dry-run]
 */
import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import OpenAI from "openai";
import postgres from "postgres";
import { detransComments } from "../db/schema";

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-large";
const COLLECTION = "default_v2";
const EXPECTED_DIMS = 3072;

interface Options {
  batch: number;
  limit: number | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { batch: 50, limit: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--batch":
        opts.batch = parseInt(argv[++i] ?? "", 10);
        break;
      case "--limit":
        opts.limit = parseInt(argv[++i] ?? "", 10);
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
      const status = err?.status;
      const message = String(err?.message ?? err);
      const retryable =
        status === 429 ||
        (typeof status === "number" && status >= 500) ||
        /timeout|econnreset|etimedout|fetch failed|socket hang up/i.test(
          message,
        );
      if (attempt >= attempts - 1 || !retryable) throw err;
      const delay =
        Math.min(30_000, 1_000 * 2 ** attempt) + Math.random() * 500;
      console.warn(
        `  [retry ${attempt + 1}/${attempts}] ${label}: ${message.slice(0, 140)}`,
      );
      await sleep(delay);
    }
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");

  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: 4 });
  const db = drizzle(client);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL || "http://localhost:6334",
    checkCompatibility: false,
    timeout: 60000,
  });

  const eligibleFilter = and(
    gte(detransComments.score, 3),
    eq(detransComments.enriched, true),
    eq(detransComments.embedded, false),
    isNotNull(detransComments.summary),
    isNotNull(detransComments.questions),
  );

  const [{ count: totalEligible }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(detransComments)
    .where(eligibleFilter);

  console.log("=== Comment embedding -> Qdrant default_v2 ===");
  console.log(`Model:       ${EMBEDDING_MODEL} (${EXPECTED_DIMS} dims)`);
  console.log(
    `Qdrant:      ${process.env.QDRANT_URL || "http://localhost:6334"}`,
  );
  console.log(`Eligible:    ${totalEligible} comments`);
  console.log(`Mode:        ${opts.dryRun ? "DRY RUN" : "write"}`);
  console.log();

  let processed = 0;
  let embedded = 0;
  let failed = 0;
  let totalTokens = 0;
  const started = Date.now();

  while (true) {
    if (opts.limit && processed >= opts.limit) break;

    const rows = await db
      .select({
        uuid: detransComments.uuid,
        text: detransComments.text,
        summary: detransComments.summary,
        questions: detransComments.questions,
        keywords: detransComments.keywords,
        username: detransComments.username,
        userFlair: detransComments.userFlair,
        link: detransComments.link,
        score: detransComments.score,
        created: detransComments.created,
        id: detransComments.id,
        parentId: detransComments.parentId,
        linkId: detransComments.linkId,
      })
      .from(detransComments)
      .where(eligibleFilter)
      .orderBy(detransComments.uuid)
      .limit(
        Math.min(
          opts.batch,
          opts.limit ? Math.max(0, opts.limit - processed) : opts.batch,
        ),
      );

    if (rows.length === 0) {
      console.log("\nAll eligible comments embedded.");
      break;
    }

    const inputs: string[] = [];
    for (const row of rows) {
      inputs.push(row.questions!);
      inputs.push(row.summary!);
      inputs.push(row.text.slice(0, 6000));
    }

    let vectors: number[][];
    try {
      const response = await withRetry(
        () =>
          openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: inputs,
          }),
        `embeddings batch ${processed}`,
      );
      totalTokens += response.usage?.total_tokens ?? 0;
      vectors = response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding as number[]);
      if (vectors[0]?.length !== EXPECTED_DIMS) {
        throw new Error(
          `Unexpected embedding dims: ${vectors[0]?.length} (expected ${EXPECTED_DIMS})`,
        );
      }
    } catch (err: any) {
      failed += rows.length;
      console.error(
        `  [fail] embedding batch: ${String(err?.message ?? err).slice(0, 200)}`,
      );
      // do not advance; same rows retried next loop would loop forever —
      // stop instead so failures are visible.
      break;
    }

    const points = rows.map((row, i) => ({
      id: row.uuid,
      vector: {
        questions: vectors[i * 3],
        summary: vectors[i * 3 + 1],
        combined: vectors[i * 3 + 2],
      },
      payload: {
        username: row.username,
        userFlair: row.userFlair,
        link: row.link,
        score: row.score,
        created: Math.floor(row.created.getTime() / 1000),
        id: row.id,
        parent_id: row.parentId,
        link_id: row.linkId,
        sectionSummary: row.summary,
        questionsThisExcerptCanAnswer: row.questions,
        excerptKeywords: row.keywords,
        _node_content: JSON.stringify({
          text: row.text,
          id_: row.uuid,
          type: "TEXT",
          relationships: {},
        }),
        _node_type: "TextNode",
        document_id: "None",
        doc_id: "None",
        ref_doc_id: "None",
      },
    }));

    if (opts.dryRun) {
      if (processed === 0) {
        const sample: any = { ...points[0], vector: "[3 x 3072]" };
        sample.payload = { ...sample.payload, _node_content: "[...]" };
        console.log("Sample point:");
        console.log(JSON.stringify(sample, null, 2));
      }
    } else {
      try {
        await withRetry(
          () => qdrant.upsert(COLLECTION, { points: points as any }),
          `qdrant upsert batch ${processed}`,
        );
      } catch (err: any) {
        failed += rows.length;
        console.error(
          `  [fail] qdrant upsert: ${String(err?.message ?? err).slice(0, 300)}`,
        );
        break;
      }
      const uuids = rows.map((r) => r.uuid);
      await db
        .update(detransComments)
        .set({ embedded: true })
        .where(inArray(detransComments.uuid, uuids));
      embedded += rows.length;
    }

    processed += rows.length;
    if (processed % 500 === 0 || processed <= rows.length) {
      const elapsedMin = (Date.now() - started) / 60000;
      const rate = processed / Math.max(elapsedMin, 0.01);
      console.log(
        `  ${processed}/${totalEligible} embedded (${rate.toFixed(0)}/min) | failed: ${failed}`,
      );
    }
    await sleep(200);
  }

  console.log();
  console.log("=== Summary ===");
  console.log(`Processed: ${processed}`);
  console.log(`Upserted:  ${embedded}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Tokens:    ${totalTokens.toLocaleString()}`);
  console.log(`Elapsed:   ${((Date.now() - started) / 60000).toFixed(1)} min`);
  if (opts.dryRun) console.log("(dry run — nothing written)");
  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
