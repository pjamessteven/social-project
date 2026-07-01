#!/usr/bin/env tsx

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { isNotNull } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import postgres from "postgres";
import { detransComments } from "../db/schema";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, "../app/lib/agents/keywords.json");

function normalizeKeywords(raw: string): string[] {
  let text = raw.trim();

  // Skip verbose LLM-generated text (too long to be a clean keyword list)
  if (text.length > 500) {
    // Try to extract keywords from a "**Keywords:**" section
    const match = text.match(/\*\*Keywords:\*\*\s*(.+)/i);
    if (match) {
      text = match[1].split("\n")[0].trim();
    } else {
      return [];
    }
  }

  // Strip "KEYWORDS:" prefix
  text = text.replace(/^KEYWORDS:\s*/i, "");

  // Strip markdown bold
  text = text.replace(/\*\*/g, "");

  // Split by comma
  const keywords = text
    .split(",")
    .map((kw) => kw.trim().toLowerCase())
    .filter((kw) => kw.length > 1 && kw.length < 100); // filter garbage

  return keywords;
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/app";
  const sql = postgres(connectionString);
  const db = drizzle(sql);

  console.log("Reading keywords from detrans_comments...");

  const rows = await db
    .select({ keywords: detransComments.keywords })
    .from(detransComments)
    .where(isNotNull(detransComments.keywords));

  console.log(`Fetched ${rows.length} rows with keywords.`);

  // Aggregate
  const counts = new Map<string, number>();
  let parsed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.keywords) continue;
    const kws = normalizeKeywords(row.keywords);
    if (kws.length === 0) {
      skipped++;
      continue;
    }
    parsed++;
    for (const kw of kws) {
      counts.set(kw, (counts.get(kw) || 0) + 1);
    }
  }

  // Sort by count descending
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  // Write JSON
  const output: Record<string, number> = {};
  for (const [kw, count] of sorted) {
    output[kw] = count;
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\nParsed: ${parsed} rows, Skipped: ${skipped} rows`);
  console.log(`Unique keywords: ${sorted.length}`);
  console.log(`Written to: ${OUTPUT_PATH}`);

  // Print top 200
  console.log("\n=== Top 200 Keywords ===\n");
  console.log(
    sorted
      .slice(0, 200)
      .map(([kw, count], i) => `${(i + 1).toString().padStart(3)}. ${kw} (${count})`)
      .join("\n"),
  );

  await sql.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
