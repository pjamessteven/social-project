/**
 * Generate short card copy (summary + 3 key findings) and topic/method
 * categories for existing studies, using the stored abstract/summary/etc.
 *
 * Two steps so the output can be reviewed before it touches a database:
 *
 *   # 1. Dry run: generate and write JSON (no DB writes)
 *   npx tsx scripts/backfill-study-cards.ts --out study-cards.json [--only-missing] [--ids 1,2,3]
 *
 *   # 2. Apply the (reviewed / hand-edited) JSON
 *   npx tsx scripts/backfill-study-cards.ts --apply study-cards.json
 *
 * Applying replaces each study's card fields + category assignments and clears
 * translations of any card text that changed (run
 * generate-study-hub-translations.ts afterwards).
 * Category slugs are mapped to ids in the target DB, so a file generated
 * against one database can be applied to another with the same categories.
 */

import * as dotenv from "dotenv";
dotenv.config();

import { readFileSync, writeFileSync } from "node:fs";
import { asc, eq, inArray, isNull } from "drizzle-orm";
import { OpenAI } from "openai";
import { setStudyCategories } from "../app/lib/study-categories";
import {
  buildStudyCardPrompt,
  cardCategoryIds,
  parseStudyCardResponse,
  type CardCategoryOption,
  type StudyCardResult,
} from "../app/lib/study-cards";
import { db } from "../db";
import { studies, studyCategories } from "../db/schema";

const CONCURRENCY = 4;
const SOURCE_FIELD_MAX = 6000;

interface CardEntry extends StudyCardResult {
  id: number;
  headline: string | null;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function clip(value: string | null | undefined): string {
  if (!value) return "";
  return value.length > SOURCE_FIELD_MAX
    ? value.slice(0, SOURCE_FIELD_MAX) + "…"
    : value;
}

async function loadCategories(): Promise<CardCategoryOption[]> {
  const rows = await db
    .select()
    .from(studyCategories)
    .orderBy(asc(studyCategories.sortOrder));
  if (rows.length === 0) {
    throw new Error(
      "No study categories found — run scripts/seed-study-categories.ts first",
    );
  }
  return rows;
}

// Override with STUDY_CARD_MODEL to try another OpenRouter model
const MODEL = process.env.STUDY_CARD_MODEL || "moonshotai/kimi-k2-0905:exacto";

function createLlm() {
  if (!process.env.OPENROUTER_KEY) throw new Error("OPENROUTER_KEY is not set");
  return new OpenAI({
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    timeout: 120_000,
    maxRetries: 1,
  });
}

async function generate(outPath: string) {
  const categories = await loadCategories();
  const llm = createLlm();
  const ids = arg("--ids")
    ?.split(",")
    .map((id) => Number(id.trim()))
    .filter(Number.isInteger);

  let rows = await db
    .select()
    .from(studies)
    .where(
      ids?.length
        ? inArray(studies.id, ids)
        : process.argv.includes("--only-missing")
          ? isNull(studies.cardSummary)
          : undefined,
    )
    .orderBy(asc(studies.id));
  rows = rows.filter((row) => row.approved || ids?.length);

  console.log(`Generating cards for ${rows.length} studies...`);
  const results: CardEntry[] = [];
  const failures: number[] = [];

  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const study = rows[next++];
      const source = [
        `Headline: ${study.headline ?? ""}`,
        `Title: ${study.title ?? ""}`,
        `Year: ${study.year ?? ""}  Journal: ${study.journal ?? ""}`,
        `Abstract: ${clip(study.abstract)}`,
        `Summary: ${clip(study.summary)}`,
        `Description: ${clip(study.description)}`,
        `Key points:\n${(study.keyPoints ?? []).map((p) => `- ${p}`).join("\n")}`,
        `Conclusion: ${clip(study.conclusion)}`,
        `Limitations:\n${(study.limitations ?? []).map((p) => `- ${p}`).join("\n")}`,
      ].join("\n\n");

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await llm.chat.completions.create({
            model: MODEL,
            messages: [
              {
                role: "user",
                content: buildStudyCardPrompt(categories, source),
              },
            ],
            temperature: 0.4,
          });
          const parsed = parseStudyCardResponse(
            response.choices[0]?.message?.content ?? "",
            categories,
          );
          results.push({ id: study.id, headline: study.headline, ...parsed });
          console.log(
            `  ✓ ${study.id} [${parsed.method}; ${parsed.topics.join(", ")}]`,
          );
          break;
        } catch (error) {
          if (attempt === 3) {
            console.error(`  ✗ ${study.id}:`, error);
            failures.push(study.id);
          } else {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
          }
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  results.sort((a, b) => a.id - b.id);
  writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nWrote ${results.length} entries to ${outPath}`);
  if (failures.length) console.log(`Failed: ${failures.join(", ")}`);
}

async function apply(inPath: string) {
  const categories = await loadCategories();
  const entries = JSON.parse(readFileSync(inPath, "utf8")) as CardEntry[];
  let applied = 0;

  for (const entry of entries) {
    const [study] = await db
      .select({
        id: studies.id,
        cardSummary: studies.cardSummary,
        cardKeyPoints: studies.cardKeyPoints,
      })
      .from(studies)
      .where(eq(studies.id, entry.id))
      .limit(1);
    if (!study) {
      console.warn(`  ! study ${entry.id} not found — skipped`);
      continue;
    }
    const unknown = [entry.method, ...entry.topics].filter(
      (slug) => slug && !categories.some((c) => c.slug === slug),
    );
    if (unknown.length) {
      console.warn(`  ! study ${entry.id}: unknown slugs ${unknown.join(", ")}`);
    }

    await db
      .update(studies)
      .set({
        cardSummary: entry.cardSummary,
        cardKeyPoints: entry.cardKeyPoints,
        // Only changed copy invalidates its translations
        ...(entry.cardSummary !== study.cardSummary
          ? { cardSummaryTranslation: null }
          : {}),
        ...(JSON.stringify(entry.cardKeyPoints) !==
        JSON.stringify(study.cardKeyPoints)
          ? { cardKeyPointsTranslation: null }
          : {}),
      })
      .where(eq(studies.id, entry.id));
    await setStudyCategories(entry.id, cardCategoryIds(entry, categories));
    applied++;
  }
  console.log(`Applied ${applied} of ${entries.length} entries.`);
}

async function main() {
  const applyPath = arg("--apply");
  if (applyPath) return apply(applyPath);
  const outPath = arg("--out");
  if (!outPath) {
    throw new Error("Pass --out <file.json> (dry run) or --apply <file.json>");
  }
  return generate(outPath);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
