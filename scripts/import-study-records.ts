/**
 * Import curated study records (JSON files) into the studies archive.
 *
 *   npx tsx scripts/import-study-records.ts <dir> [--apply]
 *
 * <dir>/new/*.json     — new studies (full records): inserted approved +
 *                        processed, with tags, categories and URL slugs.
 *                        Skipped if a study with the same DOI/URL or title
 *                        already exists.
 * <dir>/review/*.json  — `{ id, ...changed fields }` edits to existing
 *                        studies. Editing headline/title/description/key
 *                        points/card copy clears that field's translations so
 *                        the translation scripts regenerate them.
 *
 * Dry run by default. Afterwards run scripts/generate-study-translations.ts
 * and scripts/generate-study-hub-translations.ts, and re-embed changed
 * studies in Qdrant.
 */
import * as dotenv from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config();

interface StudyRecord {
  id?: number;
  title?: string | null;
  headline?: string | null;
  authors?: string | null;
  year?: number | null;
  journal?: string | null;
  url?: string | null;
  description?: string | null;
  abstract?: string | null;
  conclusion?: string | null;
  summary?: string | null;
  keyPoints?: string[] | null;
  limitations?: string[] | null;
  cardSummary?: string | null;
  cardKeyPoints?: string[] | null;
  tags?: string[];
  categoryIds?: number[];
  fullText?: string | null;
}

function readRecords(
  dir: string,
): Array<{ file: string; record: StudyRecord }> {
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  return files.map((file) => ({
    file,
    record: JSON.parse(readFileSync(join(dir, file), "utf8")) as StudyRecord,
  }));
}

const norm = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const doiOf = (url: string | null | undefined) =>
  url?.match(/10\.\d{4,9}\/[^\s?#]+/i)?.[0].toLowerCase() ?? null;

async function main() {
  const [dir] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const apply = process.argv.includes("--apply");
  if (!dir) throw new Error("usage: import-study-records.ts <dir> [--apply]");

  const { db } = await import("../db");
  const { studies, studyTags, studyTagRelations } =
    await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const { setStudyCategories } = await import("../app/lib/study-categories");
  const { syncStudySlugs } = await import("../app/lib/study-slugs");

  const existing = await db
    .select({ id: studies.id, title: studies.title, url: studies.url })
    .from(studies);

  async function setTags(studyId: number, names: string[]) {
    const ids: number[] = [];
    for (const raw of names) {
      const name = raw.trim().toLowerCase();
      if (!name) continue;
      let tag = (
        await db.select().from(studyTags).where(eq(studyTags.name, name))
      )[0];
      if (!tag) [tag] = await db.insert(studyTags).values({ name }).returning();
      ids.push(tag.id);
    }
    await db
      .delete(studyTagRelations)
      .where(eq(studyTagRelations.studyId, studyId));
    if (ids.length) {
      await db
        .insert(studyTagRelations)
        .values([...new Set(ids)].map((tagId) => ({ studyId, tagId })));
    }
  }

  const changed: number[] = [];

  for (const { file, record } of readRecords(join(dir, "new"))) {
    const doi = doiOf(record.url);
    const dup = existing.find(
      (s) =>
        (doi && doiOf(s.url) === doi) ||
        (record.title && norm(s.title) === norm(record.title)),
    );
    if (dup) {
      console.log(`skip new ${file}: already study ${dup.id}`);
      continue;
    }
    if (!record.title || !record.url) {
      console.log(`skip new ${file}: missing title or url`);
      continue;
    }
    console.log(`new ${file}: ${record.year} ${record.title.slice(0, 70)}`);
    if (!apply) continue;
    const [row] = await db
      .insert(studies)
      .values({
        title: record.title,
        headline: record.headline ?? null,
        authors: record.authors?.slice(0, 500) ?? null,
        year: record.year ?? null,
        journal: record.journal ?? null,
        url: record.url,
        displayUrl: record.url,
        description: record.description ?? null,
        abstract: record.abstract ?? null,
        conclusion: record.conclusion ?? null,
        summary: record.summary ?? null,
        keyPoints: record.keyPoints ?? null,
        limitations: record.limitations ?? null,
        cardSummary: record.cardSummary ?? null,
        cardKeyPoints: record.cardKeyPoints ?? null,
        fullText: record.fullText ?? null,
        approved: true,
        processed: true,
      })
      .returning({ id: studies.id });
    existing.push({ id: row.id, title: record.title, url: record.url });
    if (record.tags?.length) await setTags(row.id, record.tags);
    if (record.categoryIds?.length)
      await setStudyCategories(row.id, record.categoryIds);
    await syncStudySlugs(row.id);
    changed.push(row.id);
  }

  for (const { file, record } of readRecords(join(dir, "review"))) {
    if (!record.id) {
      console.log(`skip review ${file}: no id`);
      continue;
    }
    const current = (
      await db.select().from(studies).where(eq(studies.id, record.id))
    )[0];
    if (!current) {
      console.log(`skip review ${file}: study ${record.id} not found`);
      continue;
    }
    const set: Record<string, unknown> = {};
    const fields = [
      "title",
      "headline",
      "authors",
      "year",
      "journal",
      "url",
      "description",
      "abstract",
      "conclusion",
      "summary",
      "keyPoints",
      "limitations",
      "cardSummary",
      "cardKeyPoints",
      "fullText",
    ] as const;
    for (const field of fields) {
      if (record[field] === undefined) continue;
      if (
        JSON.stringify(record[field]) ===
        JSON.stringify((current as any)[field])
      )
        continue;
      set[field] =
        field === "authors"
          ? String(record[field]).slice(0, 500)
          : record[field];
    }
    // Edited source text invalidates its translations
    const invalidates: Record<string, string> = {
      headline: "headlineTranslation",
      title: "titleTranslation",
      description: "descriptionTranslation",
      keyPoints: "keyPointsTranslation",
      cardSummary: "cardSummaryTranslation",
      cardKeyPoints: "cardKeyPointsTranslation",
    };
    for (const [field, translation] of Object.entries(invalidates)) {
      if (field in set) set[translation] = null;
    }
    const names = Object.keys(set).filter((k) => !k.endsWith("Translation"));
    if (!names.length) {
      console.log(`review ${record.id}: no changes`);
      continue;
    }
    console.log(`review ${record.id}: ${names.join(", ")}`);
    if (!apply) continue;
    await db
      .update(studies)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(studies.id, record.id));
    if ("headline" in set || "title" in set) await syncStudySlugs(record.id);
    if (record.tags?.length) await setTags(record.id, record.tags);
    changed.push(record.id);
  }

  console.log(
    `\n${apply ? "applied" : "dry run"}: ${changed.length} studies changed${changed.length ? ` (${changed.join(",")})` : ""}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
