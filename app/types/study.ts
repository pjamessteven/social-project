import type { StudyCategoryRef } from "@/app/lib/study-category-urls";

export interface Study {
  id: number;
  headline: string | null;
  title: string | null;
  authors: string | null;
  description?: string | null;
  year: number | null;
  url: string;
  displayUrl: string;
  journal?: string | null;
  approved?: boolean;
  fullText?: string | null;
  abstract?: string | null;
  conclusion?: string | null;
  keyPoints?: string[] | null;
  keyPointsTranslation?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  limitations?: string[] | null;
  /** Short card copy (localized), falls back to description/keyPoints */
  cardSummary?: string | null;
  cardKeyPoints?: string[] | null;
  /** Curated topic/method categories (localized) */
  categories?: StudyCategoryRef[];
  /** Locale-resolved slug for /studies/[slug] links (falls back to the id) */
  slug?: string | null;
}
