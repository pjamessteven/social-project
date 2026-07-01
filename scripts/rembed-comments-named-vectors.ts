#!/usr/bin/env tsx

import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, gt, isNotNull } from "drizzle-orm";
import fs from "fs/promises";
import OpenAI from "openai";
import { fileURLToPath } from "node:url";
import path from "path";
import postgres from "postgres";
import { detransComments } from "../db/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ──────────────────────────────────────────────────────────────────
const BATCH_SIZE = 50;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-large";
const OPENAI_BATCH_SIZE = 100; // max texts per OpenAI embedding call (2 per comment)
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const OLD_COLLECTION = "default";
const NEW_COLLECTION = "default_v2";
const CHECKPOINT_PATH = path.join(__dirname, ".rembed-checkpoint.json");
const DELAY_MS = 500;
const MAX_RETRIES = 3;

// ── Types ───────────────────────────────────────────────────────────────────
interface Checkpoint {
  lastProcessedUuid: string | null;
  processedCount: number;
  failedUuids: string[];
  startedAt: string;
  updatedAt: string;
}

interface CommentRow {
  uuid: string;
  text: string;
  summary: string | null;
  questions: string | null;
  keywords: string | null;
  username: string | null;
  userFlair: string | null;
  link: string | null;
  score: number | null;
  created: Date;
  id: string;
  parentId: string | null;
  linkId: string | null;
}

// ── Clients ─────────────────────────────────────────────────────────────────
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/app";
const sql = postgres(connectionString);
const db = drizzle(sql);

const qdrant = new QdrantClient({
  url: QDRANT_URL,
  checkCompatibility: false,
  timeout: 30000,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function retry<T>(
  fn: () => Promise<T>,
  label: string,
  retries = MAX_RETRIES,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(
        `  [retry] ${label} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${backoff}ms...`,
      );
      await sleep(backoff);
    }
  }
  throw new Error("unreachable");
}

async function loadCheckpoint(): Promise<Checkpoint> {
  try {
    const raw = await fs.readFile(CHECKPOINT_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      lastProcessedUuid: null,
      processedCount: 0,
      failedUuids: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

async function saveCheckpoint(ckpt: Checkpoint) {
  ckpt.updatedAt = new Date().toISOString();
  await fs.writeFile(CHECKPOINT_PATH, JSON.stringify(ckpt, null, 2));
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await retry(
    () =>
      openai.embeddings.create({
        input: texts,
        model: EMBEDDING_MODEL,
      }),
    "openai.embeddings",
  );
  return response.data.map((d) => d.embedding as number[]);
}

// ── Ensure new collection exists ────────────────────────────────────────────
async function ensureCollection() {
  try {
    await qdrant.getCollection(NEW_COLLECTION);
    console.log(`Collection "${NEW_COLLECTION}" already exists.`);
    return;
  } catch {
    // doesn't exist — create it
  }

  console.log(`Creating collection "${NEW_COLLECTION}" with named vectors...`);
  await qdrant.createCollection(NEW_COLLECTION, {
    vectors: {
      questions: { size: 3072, distance: "Cosine" },
      summary: { size: 3072, distance: "Cosine" },
    },
  });
  console.log(`Collection "${NEW_COLLECTION}" created.`);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isStatus = args.includes("--status");
  const isReset = args.includes("--reset");

  // --limit N: stop after N batches (useful for dry run/testing)
  const limitIdx = args.indexOf("--limit");
  const batchLimit =
    limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  const ckpt = await loadCheckpoint();

  if (isStatus) {
    console.log("Checkpoint status:");
    console.log(JSON.stringify(ckpt, null, 2));
    return;
  }

  if (isReset) {
    ckpt.lastProcessedUuid = null;
    ckpt.processedCount = 0;
    ckpt.failedUuids = [];
    ckpt.startedAt = new Date().toISOString();
    await saveCheckpoint(ckpt);
    console.log("Checkpoint reset.");
    return;
  }

  if (isDryRun) {
    console.log("=== DRY RUN ===\n");
  }

  console.log(`Qdrant:    ${QDRANT_URL}`);
  console.log(`Old coll:  ${OLD_COLLECTION}`);
  console.log(`New coll:  ${NEW_COLLECTION}`);
  console.log(`Model:     ${EMBEDDING_MODEL}`);
  console.log(`Batch:     ${BATCH_SIZE}`);
  console.log(`Limit:     ${isFinite(batchLimit) ? `${batchLimit} batches` : "none"}`);
  console.log(`Resume from: ${ckpt.lastProcessedUuid ?? "(start)"}`);
  console.log(`Already processed: ${ckpt.processedCount}`);
  console.log();

  // Count eligible rows in PG
  const countResult = await sql`SELECT count(*)::text as count
    FROM detrans_comments
    WHERE summary IS NOT NULL AND questions IS NOT NULL`;
  const totalEligible = parseInt(countResult[0].count as string, 10);
  console.log(`Eligible comments in PG (have summary + questions): ${totalEligible}`);

  if (!isDryRun) {
    await ensureCollection();
  }

  let processed = ckpt.processedCount;
  let failedUuids = [...ckpt.failedUuids];
  let lastUuid = ckpt.lastProcessedUuid;
  let batchNum = 0;

  while (true) {
    // Fetch next batch from PG
    let rows: CommentRow[];
    const conditions = and(
      isNotNull(detransComments.summary),
      isNotNull(detransComments.questions),
      lastUuid !== null
        ? gt(detransComments.uuid, lastUuid!)
        : undefined,
    );

    rows = await db
      .select()
      .from(detransComments)
      .where(conditions)
      .orderBy(detransComments.uuid)
      .limit(BATCH_SIZE);

    if (rows.length === 0) {
      console.log("\nAll eligible comments processed.");
      break;
    }

    batchNum++;
    if (batchNum > batchLimit) {
      console.log(`\nReached batch limit (${batchLimit}). Stopping.`);
      break;
    }
    const uuids = rows.map((r) => r.uuid);

    // 1. Build embedding texts (questions + summary for each row)
    const embeddingTexts: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      embeddingTexts.push(rows[i].questions!);
      embeddingTexts.push(rows[i].summary!);
    }

    // 2. Generate embeddings
    let embeddings: number[][];
    try {
      embeddings = await embedBatch(embeddingTexts);
    } catch (err) {
      console.error(`  Batch ${batchNum}: embedding failed:`, err);
      failedUuids.push(...uuids);
      lastUuid = uuids[uuids.length - 1];
      processed += rows.length;
      continue;
    }

    // 3. Build Qdrant points
    const points: Array<{
      id: string;
      vector: { questions: number[]; summary: number[] };
      payload: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const questionsEmb = embeddings[i * 2];
      const summaryEmb = embeddings[i * 2 + 1];

      const createdTs = Math.floor(row.created.getTime() / 1000);

      points.push({
        id: row.uuid,
        vector: {
          questions: questionsEmb,
          summary: summaryEmb,
        },
        payload: {
          username: row.username,
          userFlair: row.userFlair,
          link: row.link,
          score: row.score,
          created: createdTs,
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
      });
    }

    // 4. Dry run or upsert
    if (isDryRun) {
      console.log(
        `  Batch ${batchNum}: would upsert ${points.length} points (rows: ${rows.length})`,
      );
      // Print first point payload as sample
      if (batchNum === 1 && points.length > 0) {
        const sample = { ...points[0] };
        (sample as any).vector = {
          questions: `[${(sample as any).vector.questions.length} dims]`,
          summary: `[${(sample as any).vector.summary.length} dims]`,
        };
        console.log("\nSample point (first):");
        console.log(JSON.stringify(sample, null, 2));
      }
    } else {
      try {
        await retry(
          () => qdrant.upsert(NEW_COLLECTION, { points }),
          "qdrant.upsert",
        );
      } catch (err) {
        console.error(`  Batch ${batchNum}: upsert failed:`, err);
        failedUuids.push(...uuids);
        lastUuid = uuids[uuids.length - 1];
        processed += rows.length;
        continue;
      }
    }

    // 6. Update checkpoint
    lastUuid = uuids[uuids.length - 1];
    processed += rows.length;

    if (!isDryRun) {
      await saveCheckpoint({
        ...ckpt,
        lastProcessedUuid: lastUuid,
        processedCount: processed,
        failedUuids,
        updatedAt: new Date().toISOString(),
      });
    }

    const pct = ((processed / totalEligible) * 100).toFixed(1);
    console.log(
      `  Batch ${batchNum}: ${isDryRun ? "would upsert" : "upserted"} ${points.length} points | ${processed}/${totalEligible} (${pct}%) | failed: ${failedUuids.length}`,
    );

    // 7. Delay between batches
    if (!isDryRun) {
      await sleep(DELAY_MS);
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failedUuids.length}`);
  if (failedUuids.length > 0) {
    console.log(`Failed UUIDs: ${failedUuids.slice(0, 20).join(", ")}${failedUuids.length > 20 ? "..." : ""}`);
  }
  console.log(`Checkpoint: ${CHECKPOINT_PATH}`);

  await sql.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
