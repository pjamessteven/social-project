/**
 * Story URL helpers (client-safe: no server/db imports).
 *
 * Public story URLs are /{locale}/{localized-stories-base}/{id}-{title-slug}
 * — e.g. /fr/histoires/3f2a9c1e-mastectomy-at-20 — where the id is the short
 * salted username hash used across the stories API (usernames never leave
 * the server; see story-id.ts) and the title slug comes from the generated
 * story title. Only the id is used for lookup; any other slug for the same
 * id redirects to the canonical one, so retitling a story never breaks links.
 */

import { defaultLocale, pathnames } from "@/i18n/routing";

const STORY_ID_PATTERN = /^([0-9a-f]{8})(?:-|$)/i;
const MAX_TITLE_SLUG_LENGTH = 80;

const storiesBases = (
  pathnames as Record<string, string | Record<string, string>>
)["/stories"];

/** Localized stories index base path, e.g. "/histoires" for fr. */
export function getStoriesBase(locale: string): string {
  if (typeof storiesBases === "string") return storiesBases;
  return storiesBases?.[locale] ?? storiesBases?.[defaultLocale] ?? "/stories";
}

/** Localized stories index path, e.g. "/fr/histoires". */
export function getStoriesPath(locale: string): string {
  return `/${locale}${getStoriesBase(locale)}`;
}

/** Localized story detail path, e.g. "/fr/histoires/3f2a9c1e-title". */
export function getStoryPath(locale: string, slug: string): string {
  return `/${locale}${getStoriesBase(locale)}/${encodeURIComponent(slug)}`;
}

/** Canonical slug for a story: its id plus an ASCII slug of its title. */
export function storySlug(id: string, title: string | null): string {
  if (!title) return id;
  let slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > MAX_TITLE_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_TITLE_SLUG_LENGTH);
    const lastHyphen = slug.lastIndexOf("-");
    if (lastHyphen > 20) slug = slug.slice(0, lastHyphen);
  }
  return slug ? `${id}-${slug}` : id;
}

/** Story id from a URL slug ("3f2a9c1e-title" → "3f2a9c1e"), or null. */
export function parseStoryId(slug: string): string | null {
  const match = STORY_ID_PATTERN.exec(slug);
  return match ? match[1].toLowerCase() : null;
}
