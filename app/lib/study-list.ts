/**
 * Server-side loader for the study grids (/studies hub and the
 * /studies/{topic|method}/[category] pages): studies with every display
 * field resolved for one locale, plus their curated categories.
 */

import {
  getStudyCategoryIdMap,
  toCategoryRef,
  type StudyCategory,
} from "@/app/lib/study-categories";
import { getStudySlugMaps, pickStudySlug } from "@/app/lib/study-slugs";
import { Study } from "@/app/types/study";
import { db } from "@/db";
import {
  studies,
  studyCategoryRelations,
  studyTagRelations,
  studyTags,
} from "@/db/schema";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

function parseJson<T>(value: string | null): Record<string, T> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, T>)
      : {};
  } catch {
    return {};
  }
}

function localized<T>(
  fallback: T,
  translationsJson: string | null,
  locale: string,
): T {
  return parseJson<T>(translationsJson)[locale] || fallback;
}

export interface LoadStudiesOptions {
  locale: string;
  /** Localized categories (used to attach category refs to each study) */
  categories: StudyCategory[];
  /** Include unapproved studies (admin views) */
  includeUnapproved?: boolean;
  /** Only studies assigned to this category */
  categoryId?: number;
}

export async function loadLocalizedStudies({
  locale,
  categories,
  includeUnapproved = false,
  categoryId,
}: LoadStudiesOptions): Promise<Study[]> {
  const filters: SQL[] = [];
  if (!includeUnapproved) filters.push(eq(studies.approved, true));
  if (categoryId !== undefined) {
    filters.push(
      inArray(
        studies.id,
        db
          .select({ id: studyCategoryRelations.studyId })
          .from(studyCategoryRelations)
          .where(eq(studyCategoryRelations.categoryId, categoryId)),
      ),
    );
  }

  const rows = await db
    .select()
    .from(studies)
    .where(filters.length > 0 ? and(...filters) : undefined)
    // Most recently published first; undated studies last
    .orderBy(sql`${studies.year} desc nulls last`, desc(studies.id));

  const studyIds = rows.map((s) => s.id);
  const [tagRows, slugMaps, categoryIdMap] = await Promise.all([
    studyIds.length > 0
      ? db
          .select({
            studyId: studyTagRelations.studyId,
            name: studyTags.name,
            translations: studyTags.translations,
          })
          .from(studyTagRelations)
          .innerJoin(studyTags, eq(studyTagRelations.tagId, studyTags.id))
          .where(inArray(studyTagRelations.studyId, studyIds))
      : Promise.resolve([]),
    getStudySlugMaps(studyIds),
    getStudyCategoryIdMap(studyIds),
  ]);

  const tagsByStudy = new Map<number, string[]>();
  for (const row of tagRows) {
    const list = tagsByStudy.get(row.studyId) ?? [];
    list.push(localized(row.name, row.translations, locale));
    tagsByStudy.set(row.studyId, list);
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  // Method first, then topics in their curated order
  const categoryOrder = new Map(categories.map((c, i) => [c.id, i]));

  return rows.map((study) => {
    const studyCategories = (categoryIdMap.get(study.id) ?? [])
      .map((id) => categoryById.get(id))
      .filter((c): c is StudyCategory => !!c)
      .sort((a, b) =>
        a.kind !== b.kind
          ? a.kind === "method"
            ? -1
            : 1
          : (categoryOrder.get(a.id) ?? 0) - (categoryOrder.get(b.id) ?? 0),
      )
      .map(toCategoryRef);

    return {
      id: study.id,
      headline: localized(study.headline, study.headlineTranslation, locale),
      title: localized(study.title, study.titleTranslation, locale),
      authors: study.authors,
      description: localized(
        study.description,
        study.descriptionTranslation,
        locale,
      ),
      year: study.year,
      url: study.url,
      displayUrl: study.displayUrl,
      journal: study.journal,
      approved: study.approved,
      keyPoints: localized(study.keyPoints, study.keyPointsTranslation, locale),
      cardSummary: localized(
        study.cardSummary,
        study.cardSummaryTranslation,
        locale,
      ),
      cardKeyPoints: localized(
        study.cardKeyPoints,
        study.cardKeyPointsTranslation,
        locale,
      ),
      tags: tagsByStudy.get(study.id) ?? [],
      categories: studyCategories,
      slug: pickStudySlug(slugMaps.get(study.id) ?? {}, locale, study.id),
    };
  });
}
