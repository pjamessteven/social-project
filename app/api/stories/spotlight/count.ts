import { db } from "@/db";
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cohortCte, type FeatureFilters } from "../../features/helpers";

/**
 * Shared by the spotlight API and the /stories page, which shows the total
 * in its description.
 */

export const QUALITY_KEY = "quality_detail_level";
export const MIN_SUMMARY_LENGTH = 120;

/** The stats page's filters when nothing has been changed. */
export const DEFAULT_FILTERS: FeatureFilters = {
  sex: null,
  minAge: 5,
  maxAge: 80,
  tagNames: [],
  excludeSuspicious: true,
  detailedOnly: false,
};

export function isDefaultFilters(filters: FeatureFilters): boolean {
  return (
    filters.sex === DEFAULT_FILTERS.sex &&
    filters.minAge === DEFAULT_FILTERS.minAge &&
    filters.maxAge === DEFAULT_FILTERS.maxAge &&
    filters.tagNames.length === 0 &&
    filters.excludeSuspicious === DEFAULT_FILTERS.excludeSuspicious &&
    filters.detailedOnly === DEFAULT_FILTERS.detailedOnly
  );
}

async function queryAllStoriesCount(): Promise<number> {
  const [row] = Array.from(
    await db.execute(sql`
      WITH ${cohortCte(DEFAULT_FILTERS)}
      SELECT count(*)::int AS total
      FROM (
        SELECT DISTINCT ON (username) username, experience_summary, experience
        FROM detrans_user_profiles
        ORDER BY username, run_id DESC
      ) lp
      JOIN cohort c ON c.username = lp.username
      LEFT JOIN (
        SELECT a.username, a.score AS quality_score
        FROM answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.key = ${QUALITY_KEY} AND f.enabled = true
      ) q ON q.username = lp.username
      WHERE length(COALESCE(lp.experience_summary, lp.experience)) >= ${MIN_SUMMARY_LENGTH}
        AND (q.quality_score IS NULL OR q.quality_score >= 1)
    `),
  ) as unknown as { total: number }[];
  return Number(row?.total ?? 0);
}

/**
 * How many stories the spotlight can show under the default filters, cached
 * for an hour (the set only changes when new stories are processed).
 */
export const countAllStories = unstable_cache(
  queryAllStoriesCount,
  ["stories-spotlight-all-count"],
  { revalidate: 3600 },
);
