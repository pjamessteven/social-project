/**
 * Translate the /studies hub content into every configured locale:
 *  - study categories: name, description and URL slug (slugs are only
 *    generated when missing, so existing URLs stay stable)
 *  - study card copy: card_summary + card_key_points
 *
 * Only missing translations are generated (editing the English source clears
 * them — see app/lib/study-categories.ts and the approve route).
 *
 * Usage:
 *   npx tsx scripts/generate-study-hub-translations.ts [--categories-only | --cards-only]
 */

import * as dotenv from "dotenv";
dotenv.config();

import { and, eq, isNotNull } from "drizzle-orm";
import { OpenAI } from "openai";
import { generateCategorySlug } from "../app/lib/study-categories";
import { db } from "../db";
import { studies, studyCategories } from "../db/schema";
import { defaultLocale, localesInfo } from "../i18n/locales";

const MODEL = process.env.TRANSLATION_MODEL || "deepseek/deepseek-chat-v3.1";
const CONCURRENCY = 8;

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 120_000,
  maxRetries: 2,
});

const targetLocales = localesInfo.filter((l) => l.code !== defaultLocale);

function parseRecord<T>(value: string | null): Record<string, T> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

/** Translate a JSON value, keeping its exact shape. */
async function translateJson<T>(
  value: T,
  language: string,
  context: string,
): Promise<T> {
  const prompt = `Translate the string values in this JSON into ${language}. ${context}
Keep the JSON structure, keys, array lengths and numbers exactly the same. Use natural, concise ${language}; keep medical terms accurate. Return ONLY the JSON.

${JSON.stringify(value, null, 2)}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        // Without this some languages (e.g. German „quotes") come back as
        // invalid JSON
        response_format: { type: "json_object" },
      });
      let text = response.choices[0]?.message?.content?.trim() ?? "";
      const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (block) text = block[1].trim();
      const parsed = JSON.parse(text) as T;
      if (JSON.stringify(Object.keys(parsed as object)) !==
          JSON.stringify(Object.keys(value as object))) {
        throw new Error("shape mismatch");
      }
      return parsed;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error("unreachable");
}

async function runPool<T>(items: T[], fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

async function translateCategories() {
  const rows = await db.select().from(studyCategories);
  const names = new Map(rows.map((r) => [r.id, parseRecord<string>(r.nameTranslation)]));
  const descriptions = new Map(
    rows.map((r) => [r.id, parseRecord<string>(r.descriptionTranslation)]),
  );
  const slugs = new Map(rows.map((r) => [r.id, parseRecord<string>(r.slugTranslation)]));

  // One call per locale with every category missing a name/description
  await runPool(targetLocales, async (locale) => {
    const missing = rows.filter(
      (r) =>
        !names.get(r.id)![locale.code] ||
        (r.description && !descriptions.get(r.id)![locale.code]),
    );
    if (missing.length === 0) return;

    const input = Object.fromEntries(
      missing.map((r) => [String(r.id), { name: r.name, description: r.description }]),
    );
    try {
      const output = await translateJson(
        input,
        locale.englishName,
        "These are category names and descriptions for a library of academic studies about gender dysphoria, transition and detransition. Names are short headings.",
      );
      for (const r of missing) {
        const t = output[String(r.id)];
        if (!t?.name) continue;
        names.get(r.id)![locale.code] = t.name.trim();
        if (t.description) descriptions.get(r.id)![locale.code] = t.description.trim();
      }
      console.log(`  ✓ categories → ${locale.code} (${missing.length})`);
    } catch (error) {
      console.error(`  ✗ categories → ${locale.code}:`, error);
    }
  });

  // Slugs: only fill missing ones, unique per kind + locale
  for (const locale of targetLocales) {
    const taken = new Set<string>();
    for (const r of rows) {
      const existing = slugs.get(r.id)![locale.code];
      if (existing) taken.add(`${r.kind}:${existing}`);
    }
    for (const r of rows) {
      const map = slugs.get(r.id)!;
      if (map[locale.code]) continue;
      const name = names.get(r.id)![locale.code];
      if (!name) continue;
      let slug = generateCategorySlug(name) || r.slug;
      if (taken.has(`${r.kind}:${slug}`)) slug = `${slug}-${r.id}`;
      taken.add(`${r.kind}:${slug}`);
      map[locale.code] = slug;
    }
  }

  for (const r of rows) {
    await db
      .update(studyCategories)
      .set({
        nameTranslation: JSON.stringify(names.get(r.id)),
        descriptionTranslation: JSON.stringify(descriptions.get(r.id)),
        slugTranslation: JSON.stringify(slugs.get(r.id)),
      })
      .where(eq(studyCategories.id, r.id));
  }
  console.log(`Saved translations for ${rows.length} categories.`);
}

async function translateCards() {
  const rows = await db
    .select({
      id: studies.id,
      cardSummary: studies.cardSummary,
      cardKeyPoints: studies.cardKeyPoints,
      cardSummaryTranslation: studies.cardSummaryTranslation,
      cardKeyPointsTranslation: studies.cardKeyPointsTranslation,
    })
    .from(studies)
    .where(and(eq(studies.approved, true), isNotNull(studies.cardSummary)));

  let saved = 0;
  await runPool(rows, async (study) => {
    const summaries = parseRecord<string>(study.cardSummaryTranslation);
    const keyPoints = parseRecord<string[]>(study.cardKeyPointsTranslation);
    const source = {
      summary: study.cardSummary!,
      keyPoints: study.cardKeyPoints ?? [],
    };
    const missing = targetLocales.filter(
      (l) =>
        !summaries[l.code] ||
        (source.keyPoints.length > 0 && !keyPoints[l.code]),
    );
    if (missing.length === 0) return;

    for (const locale of missing) {
      try {
        const out = await translateJson(
          source,
          locale.englishName,
          "This is a one-sentence summary and key findings of an academic study, shown on a compact card.",
        );
        if (
          typeof out.summary !== "string" ||
          !Array.isArray(out.keyPoints) ||
          out.keyPoints.length !== source.keyPoints.length
        ) {
          throw new Error("shape mismatch");
        }
        summaries[locale.code] = out.summary.trim();
        keyPoints[locale.code] = out.keyPoints.map((p) => String(p).trim());
      } catch (error) {
        console.error(`  ✗ study ${study.id} → ${locale.code}:`, error);
      }
    }

    await db
      .update(studies)
      .set({
        cardSummaryTranslation: JSON.stringify(summaries),
        cardKeyPointsTranslation: JSON.stringify(keyPoints),
      })
      .where(eq(studies.id, study.id));
    saved++;
    console.log(`  ✓ study ${study.id} (${missing.length} locales)`);
  });
  console.log(`Saved card translations for ${saved} studies.`);
}

async function main() {
  if (!process.env.OPENROUTER_KEY) throw new Error("OPENROUTER_KEY is not set");
  if (!process.argv.includes("--cards-only")) await translateCategories();
  if (!process.argv.includes("--categories-only")) await translateCards();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
