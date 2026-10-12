import { DEFAULT_NOUL_THRESHOLD } from "@/app/lib/feature-taxonomy";
import { sql, type SQL } from "drizzle-orm";
import type { NextRequest } from "next/server";

/**
 * Shared query helpers for the Jev feature stats endpoints.
 *
 * The feature tables are append-only per processing run. Runs may be
 * incremental (e.g. a new question extracted on its own), so the latest
 * answer is resolved per (username, feature) across runs rather than
 * assuming the newest run answers every feature. All endpoints share the
 * same CTE chain:
 *
 *   answers  -> newest answer per (username, feature_id)
 *   filtered -> detrans_users passing the sex/age/tag filters (suspicious
 *               accounts excluded by default)
 *   cohort   -> filtered users that actually have feature answers and whose
 *               story clearly confirms detransition or desistance
 *
 * Stats are always computed against `cohort`, so coverage reads
 * "n of evaluated stories" instead of being diluted by users the processing
 * pipeline has not reached yet. The stats dataset only covers people who
 * left transition behind: the latest current_status must be detransitioned
 * or desisted, and anyone flagged never_transitioned is dropped (the
 * "desisted" label also admits people who never started transitioning).
 */

/** quality_detail_level score (0-3) needed for the "detailed only" filter. */
export const DETAILED_STORY_MIN_SCORE = 2;

export interface FeatureFilters {
  sex: "m" | "f" | null;
  minAge: number;
  maxAge: number;
  tagNames: string[];
  excludeSuspicious: boolean;
  /** Only keep stories the model rated "reasonably detailed" or better. */
  detailedOnly: boolean;
}

function clampInt(raw: string | null, fallback: number): number {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0), 120);
}

export function parseFeatureFilters(request: NextRequest): FeatureFilters {
  const { searchParams } = new URL(request.url);
  const sex = searchParams.get("sex");
  const minAge = clampInt(searchParams.get("minAge"), 5);
  const maxAge = Math.max(clampInt(searchParams.get("maxAge"), 80), minAge);
  const tagNames = (searchParams.get("tag") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    sex: sex === "m" || sex === "f" ? sex : null,
    minAge,
    maxAge,
    tagNames,
    excludeSuspicious: searchParams.get("excludeSuspicious") !== "0",
    detailedOnly: searchParams.get("detail") === "high",
  };
}

/** CTE chain shared by every feature stats query. Always followed by SELECT. */
export function cohortCte(filters: FeatureFilters): SQL {
  // The new pipeline (detrans_user_profiles / detrans_user_timelines) is the
  // user dimension for feature answers; the legacy detrans_users row is only a
  // fallback while the reprocessing runs are still catching up.
  const sexExpr = sql`COALESCE(p.sex, du.sex)`;
  const ageExpr = sql`COALESCE(t.transition_age, du.transition_age)`;

  const userConditions: SQL[] = [
    sql`(${ageExpr} IS NULL OR ${ageExpr} >= ${filters.minAge})`,
    sql`(${ageExpr} IS NULL OR ${ageExpr} <= ${filters.maxAge})`,
  ];

  if (filters.sex) {
    userConditions.push(sql`${sexExpr} = ${filters.sex}`);
  }

  if (filters.tagNames.length > 0) {
    userConditions.push(sql`a.username IN (
      SELECT ut.username
      FROM detrans_user_tags ut
      JOIN detrans_tags tag ON tag.id = ut.tag_id
      WHERE tag.name IN (${sql.join(
        filters.tagNames.map((name) => sql`${name}`),
        sql`, `,
      )})
      GROUP BY ut.username
      HAVING COUNT(DISTINCT ut.tag_id) = ${filters.tagNames.length}
    )`);
  }

  if (filters.excludeSuspicious) {
    // The suspicious set is materialized once; a correlated subquery against
    // the (large) answers CTE makes the planner pick a nested loop that
    // rescans it per candidate row, which is minutes of work.
    userConditions.push(sql`NOT EXISTS (
      SELECT 1
      FROM suspicious_users su
      WHERE su.username = a.username
    )`);
  }

  if (filters.detailedOnly) {
    userConditions.push(sql`EXISTS (
      SELECT 1
      FROM answers da
      JOIN detrans_features df ON df.id = da.feature_id
      WHERE da.username = a.username
        AND df.key = 'quality_detail_level'
        AND da.score >= ${DETAILED_STORY_MIN_SCORE}
    )`);
  }

  return sql`
    answers AS (
      SELECT DISTINCT ON (username, feature_id)
        username,
        feature_id,
        kind,
        noul,
        choice,
        score,
        confidence,
        probabilities
      FROM detrans_user_features
      ORDER BY username, feature_id, run_id DESC
    ),
    latest_profiles AS (
      SELECT DISTINCT ON (username) username, sex
      FROM detrans_user_profiles
      ORDER BY username, run_id DESC
    ),
    latest_timelines AS (
      SELECT DISTINCT ON (username)
        username,
        transition_age,
        detransition_age,
        first_dysphoria_age,
        hormones_age,
        puberty_blockers_age,
        top_surgery_age,
        bottom_surgery_age,
        transition_year,
        detransition_year
      FROM detrans_user_timelines
      ORDER BY username, run_id DESC
    ),
    stats_status AS MATERIALIZED (
      SELECT sa.username
      FROM answers sa
      JOIN detrans_features sf ON sf.id = sa.feature_id
      WHERE sf.key = 'current_status'
        AND sa.choice IN ('detransitioned', 'desisted')
    ),
    never_transitioned AS MATERIALIZED (
      SELECT na.username
      FROM answers na
      JOIN detrans_features nf ON nf.id = na.feature_id
      WHERE nf.key = 'never_transitioned'
        AND na.noul >= COALESCE(nf.threshold, ${DEFAULT_NOUL_THRESHOLD})
    ),
    suspicious_users AS MATERIALIZED (
      SELECT sa.username
      FROM answers sa
      JOIN detrans_features sf ON sf.id = sa.feature_id
      WHERE sf.key = 'quality_suspicious_account'
        AND sa.noul >= COALESCE(sf.threshold, 0.6)
    ),
    filtered_users AS (
      SELECT
        a.username,
        COALESCE(p.sex, du.sex) AS sex
      FROM (SELECT DISTINCT username FROM answers) a
      LEFT JOIN latest_profiles p ON p.username = a.username
      LEFT JOIN latest_timelines t ON t.username = a.username
      LEFT JOIN detrans_users du ON du.username = a.username
      WHERE ${sql.join(userConditions, sql` AND `)}
    ),
    cohort AS MATERIALIZED (
      SELECT DISTINCT a.username
      FROM answers a
      JOIN filtered_users fu ON fu.username = a.username
      JOIN stats_status ss ON ss.username = a.username
      WHERE NOT EXISTS (
        SELECT 1 FROM never_transitioned nt WHERE nt.username = a.username
      )
    ),
    filtered_answers AS (
      SELECT
        a.username,
        a.feature_id,
        a.kind,
        a.noul,
        a.choice,
        a.score,
        a.confidence,
        a.probabilities
      FROM answers a
      JOIN cohort c ON c.username = a.username
    )
  `;
}

export const FEATURE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
} as const;

export const NOUL_THRESHOLD = DEFAULT_NOUL_THRESHOLD;
