/**
 * Study URL helpers (client-safe: no server/db imports).
 *
 * Public study URLs are /{locale}/{localized-studies-base}/{slug} — e.g.
 * /fr/etudes/etude-sur-la-detransition — where the base comes from the i18n
 * pathnames table and the per-locale slug lives in `study_slugs` (see
 * app/lib/study-slugs.ts). Legacy numeric URLs (/studies/42) stay valid and
 * redirect server-side to the canonical slug URL.
 */

import { defaultLocale, pathnames } from "@/i18n/routing";

const studiesBases = (
  pathnames as Record<string, string | Record<string, string>>
)["/studies"];

/** Localized studies index base path, e.g. "/etudes" for fr. */
export function getStudiesBase(locale: string): string {
  if (typeof studiesBases === "string") return studiesBases;
  return studiesBases?.[locale] ?? studiesBases?.[defaultLocale] ?? "/studies";
}

/** Localized studies index path, e.g. "/fr/etudes". */
export function getStudiesPath(locale: string): string {
  return `/${locale}${getStudiesBase(locale)}`;
}

/**
 * Localized study detail path, e.g. "/fr/etudes/etude-sur-la-detransition".
 * The slug is percent-encoded (slugs are letters/numbers/hyphens only, so
 * this never double-encodes) and safe for links, redirects and sitemaps.
 */
export function getStudyPath(locale: string, slug: string): string {
  return `/${locale}${getStudiesBase(locale)}/${encodeURIComponent(slug)}`;
}

/** Slug that should represent the study in `locale`, with safe fallbacks. */
export function pickStudySlug(
  slugs: Record<string, string>,
  locale: string,
  studyId: number,
): string {
  return slugs[locale] ?? slugs[defaultLocale] ?? String(studyId);
}
