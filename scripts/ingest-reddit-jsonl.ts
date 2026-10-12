#!/usr/bin/env tsx
/**
 * Ingest Reddit JSONL exports (pushshift / arctic-shift field shapes) into Postgres.
 *
 * Comments -> detrans_comments, posts -> detrans_posts.
 *
 * Merge semantics:
 *   * Reddit base36 `id` is the conflict key (unique index).
 *   * Existing rows are skipped by default; pass --update to refresh
 *     score/link/text (and post metadata) without touching enrichment flags.
 *   * New rows get a deterministic UUIDv5 (valid Qdrant point id) instead of a
 *     Qdrant-assigned UUID, so Postgres and a future embedding pass agree.
 *
 * Usage:
 *   npx tsx scripts/ingest-reddit-jsonl.ts --type comments --file /path/to/comments.jsonl
 *   npx tsx scripts/ingest-reddit-jsonl.ts --type posts    --file /path/to/posts.jsonl
 *
 * Options:
 *   --type comments|posts      required
 *   --file <path>              required; repeatable for multiple files
 *   --dry-run                  parse + report only, no DB writes, no checkpoint
 *   --update                   refresh existing rows instead of skipping them
 *   --include-tombstones       keep [removed]/[deleted] bodies (default: skip)
 *   --batch-size <n>           insert batch size (default 1000)
 *   --fresh                    ignore the resume checkpoint and re-scan from line 1
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { detransComments, detransPosts } from "../db/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHECKPOINT_PATH = path.join(__dirname, "checkpoint-ingest-reddit.json");
// RFC 4122 DNS namespace, used with names like "detrans:comment:<id>".
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

type ContentKind = "comments" | "posts";
type CommentInsert = typeof detransComments.$inferInsert;
type PostInsert = typeof detransPosts.$inferInsert;
type ContentInsert = CommentInsert | PostInsert;

interface Options {
  kind: ContentKind;
  files: string[];
  dryRun: boolean;
  update: boolean;
  includeTombstones: boolean;
  batchSize: number;
  fresh: boolean;
}

interface CheckpointEntry {
  line: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
  failed: number;
  startedAt: string;
  updatedAt: string;
}

type Checkpoint = Record<string, CheckpointEntry>;

// ── Helpers ─────────────────────────────────────────────────────────────────

function uuidv5(name: string): string {
  const namespace = Buffer.from(UUID_NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(namespace)
    .update(name, "utf8")
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50; // version 5
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Normalize a reddit permalink to the relative form used by the DB. */
function normalizePermalink(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let s = value.trim().replace(/^https?:\/\/(www\.)?reddit\.com/i, "");
  if (!s.startsWith("/")) s = `/${s}`;
  s = `${s.replace(/\/+$/, "")}/`;
  return s.length > 1024 ? s.slice(0, 1024) : s;
}

function toUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 255) : null;
}

function toFlair(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 255) : null;
}

function toScore(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toCreated(value: unknown): Date | null {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

function isTombstoned(body: string): boolean {
  return body === "" || body === "[removed]" || body === "[deleted]";
}

function normalizeComment(obj: any, opts: Options): CommentInsert | null {
  const id = obj?.id != null ? String(obj.id) : null;
  if (!id) return null;

  const rawBody = typeof obj.body === "string" ? obj.body : "";
  const body = rawBody.trim();
  if (isTombstoned(body) && !opts.includeTombstones) return null;

  const created = toCreated(obj.created_utc);
  if (!created) return null;

  return {
    uuid: uuidv5(`detrans:comment:${id}`),
    text: body || "[removed]",
    summary: null,
    questions: null,
    keywords: null,
    username: toUsername(obj.author),
    userFlair: toFlair(obj.author_flair_text),
    link: normalizePermalink(obj.permalink),
    score: toScore(obj.score),
    created,
    id,
    parentId: typeof obj.parent_id === "string" ? obj.parent_id : null,
    linkId: typeof obj.link_id === "string" ? obj.link_id : null,
  };
}

function normalizePost(obj: any, _opts: Options): PostInsert | null {
  const id = obj?.id != null ? String(obj.id) : null;
  if (!id) return null;

  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (!title) return null;

  let selftext = typeof obj.selftext === "string" ? obj.selftext.trim() : "";
  if (selftext === "[removed]" || selftext === "[deleted]") selftext = "";

  const created = toCreated(obj.created_utc);
  if (!created) return null;

  return {
    uuid: uuidv5(`detrans:post:${id}`),
    title: title.slice(0, 30000),
    text: selftext,
    summary: null,
    questions: null,
    keywords: null,
    username: toUsername(obj.author),
    userFlair: toFlair(obj.author_flair_text),
    link: normalizePermalink(obj.permalink),
    score: toScore(obj.score),
    created,
    id,
    url: typeof obj.url === "string" ? obj.url : null,
    numComments: toScore(obj.num_comments),
    isSelf: typeof obj.is_self === "boolean" ? obj.is_self : null,
    linkFlair: toFlair(obj.link_flair_text),
  };
}

// ── Checkpoint ──────────────────────────────────────────────────────────────

async function loadCheckpoint(): Promise<Checkpoint> {
  try {
    return JSON.parse(
      await fs.readFile(CHECKPOINT_PATH, "utf-8"),
    ) as Checkpoint;
  } catch {
    return {};
  }
}

async function saveCheckpoint(ckpt: Checkpoint) {
  await fs.writeFile(CHECKPOINT_PATH, JSON.stringify(ckpt, null, 2));
}

// ── Inserts ─────────────────────────────────────────────────────────────────

async function flushBatch(
  db: any,
  opts: Options,
  batch: ContentInsert[],
): Promise<{
  inserted: number;
  updated: number;
  conflicts: number;
  failed: number;
}> {
  const table = opts.kind === "comments" ? detransComments : detransPosts;

  const updateSet =
    opts.kind === "comments"
      ? {
          text: sql`excluded.text`,
          score: sql`excluded.score`,
          link: sql`excluded.link`,
        }
      : {
          title: sql`excluded.title`,
          text: sql`excluded.text`,
          score: sql`excluded.score`,
          link: sql`excluded.link`,
          url: sql`excluded.url`,
          numComments: sql`excluded.num_comments`,
          isSelf: sql`excluded.is_self`,
          linkFlair: sql`excluded.link_flair`,
        };

  try {
    const rows = opts.update
      ? await db
          .insert(table)
          .values(batch as any)
          .onConflictDoUpdate({
            target: table.id,
            set: updateSet,
          })
          .returning({ id: table.id })
      : await db
          .insert(table)
          .values(batch as any)
          .onConflictDoNothing({ target: table.id })
          .returning({ id: table.id });
    return opts.update
      ? { inserted: 0, updated: rows.length, conflicts: 0, failed: 0 }
      : {
          inserted: rows.length,
          updated: 0,
          conflicts: batch.length - rows.length,
          failed: 0,
        };
  } catch (err) {
    // Batch failed (likely a link collision on a different id) — retry one by
    // one so a single bad row doesn't drop the whole batch.
    console.warn(
      `  [batch failed, retrying row by row] ${(err as Error).message.slice(0, 200)}`,
    );
    let inserted = 0;
    let updated = 0;
    let conflicts = 0;
    let failed = 0;
    for (const row of batch) {
      try {
        if (opts.update) {
          await db
            .insert(table)
            .values(row as any)
            .onConflictDoUpdate({ target: table.id, set: updateSet });
          updated++;
        } else {
          const res = await db
            .insert(table)
            .values(row as any)
            .onConflictDoNothing({ target: table.id })
            .returning({ id: table.id });
          if (res.length > 0) inserted++;
          else conflicts++;
        }
      } catch (rowErr) {
        failed++;
        console.error(
          `  [row failed] ${opts.kind} id=${(row as any).id}: ${(rowErr as Error).message.slice(0, 200)}`,
        );
      }
    }
    return { inserted, updated, conflicts, failed };
  }
}

// ── Per-file ingestion ──────────────────────────────────────────────────────

interface FileStats {
  file: string;
  lines: number;
  inserted: number;
  updated: number;
  conflicts: number;
  skipped: number;
  failed: number;
}

async function ingestFile(
  db: any,
  opts: Options,
  file: string,
  checkpoint: Checkpoint,
): Promise<FileStats> {
  const key = `${opts.kind}|${file}`;
  const entry: CheckpointEntry = opts.fresh
    ? {
        line: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        conflicts: 0,
        failed: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : (checkpoint[key] ?? {
        line: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        conflicts: 0,
        failed: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  checkpoint[key] = entry;

  const resumeFrom = entry.line;
  let lineNo = 0;
  let seenCount = 0;
  const seen = new Set<string>();
  let batch: ContentInsert[] = [];
  const started = Date.now();

  const stats: FileStats = {
    file,
    lines: 0,
    inserted: entry.inserted,
    updated: entry.updated,
    conflicts: entry.conflicts ?? 0,
    skipped: entry.skipped,
    failed: entry.failed,
  };

  const reportProgress = (force = false) => {
    stats.lines = lineNo;
    const processed = lineNo - resumeFrom;
    if (!force && processed % 25000 !== 0) return;
    const elapsed = (Date.now() - started) / 1000;
    const rate = elapsed > 0 ? Math.round((lineNo - resumeFrom) / elapsed) : 0;
    console.log(
      `  ${opts.kind}: line ${lineNo.toLocaleString()} | ` +
        `inserted ${stats.inserted.toLocaleString()} | updated ${stats.updated.toLocaleString()} | ` +
        `existing ${stats.conflicts.toLocaleString()} | skipped ${stats.skipped.toLocaleString()} | ` +
        `failed ${stats.failed.toLocaleString()} | ${rate}/s`,
    );
  };

  const rl = readline.createInterface({
    input: createReadStream(file),
    crlfDelay: Infinity,
  });

  try {
    for await (const line of rl) {
      lineNo++;
      if (lineNo <= resumeFrom) continue;

      if (!line.trim()) {
        stats.skipped++;
        continue;
      }

      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        stats.skipped++;
        continue;
      }

      const row =
        opts.kind === "comments"
          ? normalizeComment(obj, opts)
          : normalizePost(obj, opts);
      if (!row) {
        stats.skipped++;
        continue;
      }

      // Guard against duplicate ids inside the same file (batch upsert with a
      // repeated conflict key is an error in Postgres).
      const id = String((row as any).id);
      if (seen.has(id)) {
        stats.skipped++;
        continue;
      }
      seen.add(id);
      seenCount++;

      batch.push(row);

      if (batch.length >= opts.batchSize) {
        if (!opts.dryRun) {
          const res = await flushBatch(db, opts, batch);
          stats.inserted += res.inserted;
          stats.updated += res.updated;
          stats.conflicts += res.conflicts;
          stats.failed += res.failed;
        } else {
          stats.inserted += batch.length;
        }
        batch = [];
        entry.line = lineNo;
        entry.inserted = stats.inserted;
        entry.updated = stats.updated;
        entry.skipped = stats.skipped;
        entry.conflicts = stats.conflicts;
        entry.failed = stats.failed;
        entry.updatedAt = new Date().toISOString();
        if (!opts.dryRun) await saveCheckpoint(checkpoint);
        reportProgress(true);
      }
    }

    if (batch.length > 0) {
      if (!opts.dryRun) {
        const res = await flushBatch(db, opts, batch);
        stats.inserted += res.inserted;
        stats.updated += res.updated;
        stats.conflicts += res.conflicts;
        stats.failed += res.failed;
      } else {
        stats.inserted += batch.length;
      }
      batch = [];
    }

    if (!opts.dryRun) {
      entry.line = lineNo;
      entry.inserted = stats.inserted;
      entry.updated = stats.updated;
      entry.skipped = stats.skipped;
      entry.conflicts = stats.conflicts;
      entry.failed = stats.failed;
      entry.updatedAt = new Date().toISOString();
      await saveCheckpoint(checkpoint);
    }
  } finally {
    rl.close();
  }

  stats.lines = lineNo;
  const elapsed = (Date.now() - started) / 1000;
  console.log(
    `  done: ${lineNo.toLocaleString()} lines | inserted ${stats.inserted.toLocaleString()} | ` +
      `updated ${stats.updated.toLocaleString()} | existing ${stats.conflicts.toLocaleString()} | ` +
      `skipped ${stats.skipped.toLocaleString()} | failed ${stats.failed.toLocaleString()} | ${elapsed.toFixed(1)}s`,
  );
  return stats;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    kind: "comments",
    files: [],
    dryRun: false,
    update: false,
    includeTombstones: false,
    batchSize: 1000,
    fresh: false,
  };
  let kindSet = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--type": {
        const value = argv[++i];
        if (value !== "comments" && value !== "posts") {
          throw new Error(
            `--type must be "comments" or "posts", got "${value}"`,
          );
        }
        opts.kind = value;
        kindSet = true;
        break;
      }
      case "--file": {
        const value = argv[++i];
        if (!value) throw new Error("--file requires a path");
        opts.files.push(path.resolve(value));
        break;
      }
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--update":
        opts.update = true;
        break;
      case "--include-tombstones":
        opts.includeTombstones = true;
        break;
      case "--batch-size": {
        const value = parseInt(argv[++i] ?? "", 10);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error("--batch-size requires a positive integer");
        }
        opts.batchSize = value;
        break;
      }
      case "--fresh":
        opts.fresh = true;
        break;
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        // Bare path convenience: treat as --file
        opts.files.push(path.resolve(arg));
    }
  }

  if (!kindSet) throw new Error("--type is required (comments|posts)");
  if (opts.files.length === 0) throw new Error("--file is required");
  return opts;
}

function usage() {
  console.log(
    "Usage: npx tsx scripts/ingest-reddit-jsonl.ts --type comments|posts --file <path> [--file <path>...]",
    "\nOptions: --dry-run --update --include-tombstones --batch-size <n> --fresh",
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: 4 });
  const db = drizzle(client);

  console.log("=== Reddit JSONL ingest ===");
  console.log(`Type:      ${opts.kind}`);
  console.log(`Files:     ${opts.files.length}`);
  console.log(
    `Mode:      ${opts.dryRun ? "DRY RUN" : opts.update ? "UPSERT (update existing)" : "INSERT (skip existing)"}`,
  );
  console.log(
    `Tombstones:${opts.includeTombstones ? " included" : " skipped"}`,
  );
  console.log(`Batch:     ${opts.batchSize}`);
  console.log();

  const checkpoint = opts.fresh ? {} : await loadCheckpoint();
  const all: FileStats[] = [];

  try {
    for (const file of opts.files) {
      const exists = await fs
        .stat(file)
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        console.error(`  file not found: ${file}`);
        continue;
      }
      console.log(`Ingesting ${file}`);
      all.push(await ingestFile(db, opts, file, checkpoint));
      console.log();
    }
  } finally {
    await client.end();
  }

  const totals = all.reduce(
    (acc, s) => ({
      lines: acc.lines + s.lines,
      inserted: acc.inserted + s.inserted,
      updated: acc.updated + s.updated,
      conflicts: acc.conflicts + s.conflicts,
      skipped: acc.skipped + s.skipped,
      failed: acc.failed + s.failed,
    }),
    {
      lines: 0,
      inserted: 0,
      updated: 0,
      conflicts: 0,
      skipped: 0,
      failed: 0,
    },
  );

  console.log("=== Summary ===");
  console.log(`Lines:    ${totals.lines.toLocaleString()}`);
  console.log(`Inserted: ${totals.inserted.toLocaleString()}`);
  console.log(`Updated:  ${totals.updated.toLocaleString()}`);
  console.log(`Existing: ${totals.conflicts.toLocaleString()} (already in DB)`);
  console.log(
    `Skipped:  ${totals.skipped.toLocaleString()} (tombstones / unparsable)`,
  );
  console.log(`Failed:   ${totals.failed.toLocaleString()}`);
  if (opts.dryRun) console.log("\n(dry run — no rows written)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  usage();
  process.exit(1);
});
