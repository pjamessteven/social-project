/**
 * Shared types and helpers for the anonymous story spotlight cards and the
 * full-story reading dialog.
 */

export interface StoryChip {
  key: string;
  tag: string | null;
}

export interface Story {
  id: string;
  /** Canonical URL slug for the story page (see app/lib/story-urls.ts). */
  slug: string;
  name: string | null;
  sex: "m" | "f" | null;
  /** Whether the person describes detransition or desistance. */
  status: "detransitioned" | "desisted" | null;
  excerpt: string;
  upvotes: number;
  ages: {
    firstDysphoria: number | null;
    transition: number | null;
    detransition: number | null;
  };
  chips: StoryChip[];
}

export interface StoryDetail {
  summary: string | null;
  summaryTranslation: string | null;
  experience: string | null;
  experienceTranslation: string | null;
}

/** Resolve a JSON {locale: text} translation column, falling back to source. */
export function pickLocalized(
  translationsJson: string | null,
  fallback: string | null,
  locale: string,
): string | null {
  if (translationsJson) {
    try {
      const translations = JSON.parse(translationsJson) as Record<
        string,
        string
      >;
      const hit = translations[locale];
      if (hit) return hit;
    } catch {
      // Malformed JSON: fall through to the untranslated text.
    }
  }
  return fallback;
}

/** Compact locale-aware formatting for upvote totals (1.2k, 3.4M, …). */
export function formatUpvotes(count: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(count);
  } catch {
    return String(count);
  }
}
