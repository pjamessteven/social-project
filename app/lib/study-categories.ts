/**
 * Curated study categories (`study_categories` + `study_category_relations`).
 *
 * Two kinds: "topic" (what a study is about; a study can have several) and
 * "method" (how it was done; a study should have exactly one). Names,
 * descriptions, URL slugs and the markdown evidence summary are translated
 * per locale as JSON objects.
 * Translations are filled by scripts/generate-study-hub-translations.ts;
 * editing the English name/description clears the stale translations.
 */

import { getLocalizedValue, normalizeSegment } from "@/app/lib/pages";
import {
  isStudyCategoryKind,
  type StudyCategory,
  type StudyCategoryKind,
  type StudyCategoryRef,
} from "@/app/lib/study-category-urls";
import { db } from "@/db";
import {
  studies,
  studyCategories,
  studyCategoryRelations,
  type StudyCategoryRow,
} from "@/db/schema";
import { defaultLocale } from "@/i18n/locales";
import { asc, eq, inArray, sql } from "drizzle-orm";

export * from "@/app/lib/study-category-urls";

function parseRecord(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

/** URL-safe category slug for any script ("puberty-blockers"). */
export function generateCategorySlug(name: string): string {
  return normalizeSegment(name).slice(0, 120).replace(/-+$/g, "");
}

/** locale -> slug, with the default-locale slug always present. */
export function getCategorySlugs(
  row: StudyCategoryRow,
): Record<string, string> {
  return { ...parseRecord(row.slugTranslation), [defaultLocale]: row.slug };
}

export function pickCategorySlug(
  row: StudyCategoryRow,
  locale: string,
): string {
  return getCategorySlugs(row)[locale] || row.slug;
}

export function localizeCategory(
  row: StudyCategoryRow,
  locale: string,
  studyCount = 0,
): StudyCategory {
  return {
    id: row.id,
    kind: row.kind,
    slug: pickCategorySlug(row, locale),
    name: getLocalizedValue(row.nameTranslation, locale, row.name) ?? row.name,
    description:
      getLocalizedValue(row.descriptionTranslation, locale, row.description) ??
      row.description,
    studyCount,
  };
}

/** Markdown evidence summary for `locale`, falling back to English. */
export function localizeCategorySummary(
  row: StudyCategoryRow,
  locale: string,
): string | null {
  return getLocalizedValue(row.summaryTranslation, locale, row.summary);
}

export function toCategoryRef(category: StudyCategory): StudyCategoryRef {
  const { id, kind, slug, name } = category;
  return { id, kind, slug, name };
}

export async function getAllCategoryRows(): Promise<StudyCategoryRow[]> {
  return db
    .select()
    .from(studyCategories)
    .orderBy(asc(studyCategories.sortOrder), asc(studyCategories.name));
}

/** categoryId -> number of approved studies in it. */
export async function getApprovedStudyCounts(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      categoryId: studyCategoryRelations.categoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(studyCategoryRelations)
    .innerJoin(studies, eq(studies.id, studyCategoryRelations.studyId))
    .where(eq(studies.approved, true))
    .groupBy(studyCategoryRelations.categoryId);
  return new Map(rows.map((row) => [row.categoryId, row.count]));
}

/** All categories localized for `locale`, with approved-study counts. */
export async function getLocalizedCategories(
  locale: string,
): Promise<StudyCategory[]> {
  const [rows, counts] = await Promise.all([
    getAllCategoryRows(),
    getApprovedStudyCounts(),
  ]);
  return rows.map((row) => localizeCategory(row, locale, counts.get(row.id)));
}

/** studyId -> category ids. */
export async function getStudyCategoryIdMap(
  studyIds: number[],
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (studyIds.length === 0) return map;
  const rows = await db
    .select()
    .from(studyCategoryRelations)
    .where(inArray(studyCategoryRelations.studyId, studyIds));
  for (const row of rows) {
    const existing = map.get(row.studyId) ?? [];
    existing.push(row.categoryId);
    map.set(row.studyId, existing);
  }
  return map;
}

/** Replace a study's category assignments. Unknown ids are ignored. */
export async function setStudyCategories(
  studyId: number,
  categoryIds: number[],
): Promise<void> {
  const unique = [...new Set(categoryIds)].filter(Number.isInteger);
  const valid =
    unique.length > 0
      ? (
          await db
            .select({ id: studyCategories.id })
            .from(studyCategories)
            .where(inArray(studyCategories.id, unique))
        ).map((row) => row.id)
      : [];

  await db.transaction(async (tx) => {
    await tx
      .delete(studyCategoryRelations)
      .where(eq(studyCategoryRelations.studyId, studyId));
    if (valid.length > 0) {
      await tx
        .insert(studyCategoryRelations)
        .values(valid.map((categoryId) => ({ studyId, categoryId })));
    }
  });
}

export interface CategoryResolution {
  row: StudyCategoryRow;
  canonicalSlug: string;
  /** True when the requested param is already this locale's slug */
  canonical: boolean;
}

/**
 * Resolve a /studies/{kind}/[category] param. Another locale's slug for the
 * same category resolves but is not canonical (the page redirects).
 */
export async function resolveCategoryParam(
  kind: StudyCategoryKind,
  locale: string,
  rawParam: string,
): Promise<CategoryResolution | null> {
  let param = rawParam;
  try {
    param = decodeURIComponent(rawParam);
  } catch {
    // malformed escaping — keep the raw value
  }
  param = param.normalize("NFKC").toLowerCase();

  const rows = await db
    .select()
    .from(studyCategories)
    .where(eq(studyCategories.kind, kind));

  for (const row of rows) {
    if (pickCategorySlug(row, locale) === param) {
      return { row, canonicalSlug: param, canonical: true };
    }
  }
  for (const row of rows) {
    if (Object.values(getCategorySlugs(row)).includes(param)) {
      return {
        row,
        canonicalSlug: pickCategorySlug(row, locale),
        canonical: false,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Admin CRUD (used by /api/studies/categories)
// ---------------------------------------------------------------------------

export interface CategoryInput {
  kind?: StudyCategoryKind;
  name?: string;
  description?: string;
  slug?: string;
  sortOrder?: number;
}

export class CategoryInputError extends Error {}

export async function createCategory(
  input: CategoryInput,
): Promise<StudyCategoryRow> {
  if (!isStudyCategoryKind(input.kind)) {
    throw new CategoryInputError("kind must be 'topic' or 'method'");
  }
  const name = input.name?.trim();
  if (!name) throw new CategoryInputError("name is required");
  const slug = generateCategorySlug(input.slug?.trim() || name);
  if (!slug) throw new CategoryInputError("slug is empty");

  const [row] = await db
    .insert(studyCategories)
    .values({
      kind: input.kind,
      name,
      slug,
      description: input.description?.trim() ?? "",
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row;
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<StudyCategoryRow | null> {
  const [existing] = await db
    .select()
    .from(studyCategories)
    .where(eq(studyCategories.id, id))
    .limit(1);
  if (!existing) return null;

  const set: Partial<typeof studyCategories.$inferInsert> = {
    updatedAt: new Date(),
  };

  const name = input.name?.trim();
  if (name !== undefined && name !== existing.name) {
    if (!name) throw new CategoryInputError("name is required");
    set.name = name;
    // Stale once the English source changes; regenerated by the script.
    // Localized slugs are kept so existing URLs stay valid.
    set.nameTranslation = null;
  }
  const description = input.description?.trim();
  if (description !== undefined && description !== existing.description) {
    set.description = description;
    set.descriptionTranslation = null;
  }
  if (input.slug !== undefined) {
    const slug = generateCategorySlug(input.slug);
    if (!slug) throw new CategoryInputError("slug is empty");
    set.slug = slug;
  }
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
  if (input.kind !== undefined) {
    if (!isStudyCategoryKind(input.kind)) {
      throw new CategoryInputError("kind must be 'topic' or 'method'");
    }
    set.kind = input.kind;
  }

  const [row] = await db
    .update(studyCategories)
    .set(set)
    .where(eq(studyCategories.id, id))
    .returning();
  return row;
}

export async function deleteCategory(id: number): Promise<boolean> {
  const deleted = await db
    .delete(studyCategories)
    .where(eq(studyCategories.id, id))
    .returning({ id: studyCategories.id });
  return deleted.length > 0;
}
