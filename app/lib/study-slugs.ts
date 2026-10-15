/**
 * SEO-friendly study URLs: /{locale}/{localized-studies-base}/{headline-slug}
 * (e.g. /fr/etudes/etude-sur-la-detransition), backed by the `study_slugs`
 * table. Slugs are per-locale and derived from the localized headline/title;
 * they are regenerated whenever a study is created or edited (dynamic slugs —
 * no slug history is kept). Legacy numeric URLs (/studies/42) stay valid and
 * redirect to the canonical slug URL at request time.
 */

import { getLocalizedValue, normalizeSegment } from "@/app/lib/pages";
import {
  getStudiesBase,
  getStudiesPath,
  getStudyPath,
  pickStudySlug,
} from "@/app/lib/study-urls";
import { db } from "@/db";
import { studies, studySlugs } from "@/db/schema";
import { locales } from "@/i18n/locales";
import { and, asc, eq, inArray, ne, notInArray } from "drizzle-orm";

// URL helpers live in app/lib/study-urls.ts (client-safe); re-exported here
// for server-side consumers (pages, sitemap) that resolve slugs from the db.
export { getStudiesBase, getStudiesPath, getStudyPath, pickStudySlug };

/** Long enough to carry the headline, short enough for a sane URL. */
export const MAX_STUDY_SLUG_LENGTH = 120;

export type SlugSourceStudy = {
  id: number;
  headline: string | null;
  title: string | null;
  headlineTranslation: string | null;
  titleTranslation: string | null;
};

export interface StudySlugResolution {
  studyId: number;
  /** locale -> current slug */
  slugs: Record<string, string>;
  /** True when the requested param is already this locale's canonical slug */
  canonical: boolean;
}

/**
 * URL-safe slug for any script (letters/numbers/hyphens only, by way of
 * `normalizeSegment`), so it needs no escaping beyond percent-encoding.
 * Purely numeric slugs are reserved for legacy /studies/{id} URLs and get a
 * "study-" prefix to keep them unambiguous.
 */
export function generateStudySlug(
  name: string | null | undefined,
  studyId: number,
): string {
  const base = normalizeSegment(name ?? "")
    .slice(0, MAX_STUDY_SLUG_LENGTH)
    .replace(/-+$/g, "");
  if (!base) return `study-${studyId}`;
  return /^\d+$/.test(base) ? `study-${base}` : base;
}

/** Localized headline (falling back to the localized title) for one locale. */
export function localizedStudyName(
  study: SlugSourceStudy,
  locale: string,
): string | null {
  return (
    getLocalizedValue(study.headlineTranslation, locale, study.headline) ??
    getLocalizedValue(study.titleTranslation, locale, study.title)
  );
}

/**
 * Regenerate the per-locale slug rows for a study from its current
 * headline/title (and translations). Call after every study insert/update.
 */
export async function syncStudySlugs(studyId: number): Promise<void> {
  const study = (
    await db.select().from(studies).where(eq(studies.id, studyId)).limit(1)
  )[0];
  if (!study) return;

  const values: Array<{ studyId: number; locale: string; slug: string }> = [];

  for (const locale of locales) {
    const desired = generateStudySlug(
      localizedStudyName(study, locale),
      study.id,
    );

    // Deterministic collision suffixes keep URLs stable across re-syncs
    let slug = desired;
    for (const candidate of [
      desired,
      `${desired}-${study.id}`,
      `study-${study.id}`,
    ]) {
      const taken = await db
        .select({ studyId: studySlugs.studyId })
        .from(studySlugs)
        .where(
          and(
            eq(studySlugs.locale, locale),
            eq(studySlugs.slug, candidate),
            ne(studySlugs.studyId, study.id),
          ),
        )
        .limit(1);
      if (taken.length === 0) {
        slug = candidate;
        break;
      }
    }

    values.push({ studyId: study.id, locale, slug });
  }

  await db.transaction(async (tx) => {
    for (const value of values) {
      await tx
        .insert(studySlugs)
        .values(value)
        .onConflictDoUpdate({
          target: [studySlugs.studyId, studySlugs.locale],
          set: { slug: value.slug },
        });
    }
    // Drop rows for locales that are no longer configured
    await tx
      .delete(studySlugs)
      .where(
        and(
          eq(studySlugs.studyId, study.id),
          notInArray(studySlugs.locale, [...locales]),
        ),
      );
  });
}

export async function getStudySlugMap(
  studyId: number,
): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(studySlugs)
    .where(eq(studySlugs.studyId, studyId));
  return Object.fromEntries(rows.map((row) => [row.locale, row.slug]));
}

/** Bulk variant for list pages: studyId -> (locale -> slug). */
export async function getStudySlugMaps(
  studyIds: number[],
): Promise<Map<number, Record<string, string>>> {
  const map = new Map<number, Record<string, string>>();
  if (studyIds.length === 0) return map;

  const rows = await db
    .select()
    .from(studySlugs)
    .where(inArray(studySlugs.studyId, studyIds));
  for (const row of rows) {
    const existing = map.get(row.studyId) ?? {};
    existing[row.locale] = row.slug;
    map.set(row.studyId, existing);
  }
  return map;
}

/**
 * Resolve a /studies/[slug] path param for `locale`.
 *
 * - A purely numeric param is a legacy /studies/{id} URL (or an agent chat
 *   citation): resolved by id, never canonical.
 * - A slug matching another locale's row is the same study under a
 *   translated slug: resolved, but redirected to this locale's slug.
 * - Anything else is unknown/stale and gets the "moved" 404 page.
 */
export async function resolveStudySlugParam(
  locale: string,
  rawParam: string,
): Promise<StudySlugResolution | null> {
  const resolution = await resolveStudySlugParamUnmerged(locale, rawParam);
  if (!resolution) return null;

  // Duplicate records merged into another study redirect to it.
  const merged = (
    await db
      .select({ mergedInto: studies.mergedInto })
      .from(studies)
      .where(eq(studies.id, resolution.studyId))
      .limit(1)
  )[0]?.mergedInto;
  if (merged == null) return resolution;
  return {
    studyId: merged,
    slugs: await getStudySlugMap(merged),
    canonical: false,
  };
}

async function resolveStudySlugParamUnmerged(
  locale: string,
  rawParam: string,
): Promise<StudySlugResolution | null> {
  // Next.js passes route params percent-encoded; slugs themselves never
  // contain "%", so a single decode is safe and matches raw requests too.
  let param = rawParam;
  try {
    param = decodeURIComponent(rawParam);
  } catch {
    // malformed escaping — keep the raw value
  }

  if (/^\d+$/.test(param)) {
    const studyId = Number(param);
    const study = (
      await db
        .select({ id: studies.id })
        .from(studies)
        .where(eq(studies.id, studyId))
        .limit(1)
    )[0];
    if (!study) return null;
    return { studyId, slugs: await getStudySlugMap(studyId), canonical: false };
  }

  const exact = (
    await db
      .select({ studyId: studySlugs.studyId })
      .from(studySlugs)
      .where(and(eq(studySlugs.locale, locale), eq(studySlugs.slug, param)))
      .limit(1)
  )[0];
  if (exact) {
    return {
      studyId: exact.studyId,
      slugs: await getStudySlugMap(exact.studyId),
      canonical: true,
    };
  }

  const crossLocale = (
    await db
      .select({ studyId: studySlugs.studyId })
      .from(studySlugs)
      .where(eq(studySlugs.slug, param))
      .orderBy(asc(studySlugs.studyId))
      .limit(1)
  )[0];
  if (crossLocale) {
    return {
      studyId: crossLocale.studyId,
      slugs: await getStudySlugMap(crossLocale.studyId),
      canonical: false,
    };
  }

  return null;
}
