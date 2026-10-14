/**
 * Study category URL helpers (client-safe: no server/db imports).
 *
 * Category URLs are /{locale}/{studies-base}/{topic|method}/{category-slug},
 * e.g. /fr/etudes/theme/bloqueurs-de-puberte. The "topic"/"method" segment
 * comes from the i18n pathnames table and the category slug is per-locale
 * (`study_categories.slug_translation`, see app/lib/study-categories.ts).
 */

import { defaultLocale, pathnames } from "@/i18n/routing";

export type StudyCategoryKind = "topic" | "method";

export const STUDY_CATEGORY_KINDS: readonly StudyCategoryKind[] = [
  "topic",
  "method",
];

/** Category as passed to client components (already localized). */
export interface StudyCategory {
  id: number;
  kind: StudyCategoryKind;
  /** Localized URL slug */
  slug: string;
  name: string;
  description: string;
  studyCount: number;
}

/** Lightweight category reference attached to a study. */
export type StudyCategoryRef = Pick<
  StudyCategory,
  "id" | "kind" | "slug" | "name"
>;

const table = pathnames as Record<string, string | Record<string, string>>;

function categoryPattern(locale: string, kind: StudyCategoryKind): string {
  const entry = table[`/studies/${kind}/[category]`];
  if (typeof entry === "string") return entry;
  return (
    entry?.[locale] ?? entry?.[defaultLocale] ?? `/studies/${kind}/[category]`
  );
}

/** Localized category path, e.g. "/fr/etudes/theme/bloqueurs-de-puberte". */
export function getStudyCategoryPath(
  locale: string,
  kind: StudyCategoryKind,
  slug: string,
): string {
  return `/${locale}${categoryPattern(locale, kind).replace(
    "[category]",
    encodeURIComponent(slug),
  )}`;
}

export function isStudyCategoryKind(value: unknown): value is StudyCategoryKind {
  return value === "topic" || value === "method";
}
