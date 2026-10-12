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
 * actually transitioned and then left it behind:
 *   - latest current_status is detransitioned (implies a medical step), or
 *     desisted with a social or medical transition step on record ("desisted"
 *     also admits people who never started transitioning);
 *   - anyone flagged never_transitioned, still_identifies_trans or
 *     no_detransition_occurred is dropped.
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

/** Any of these marks a story as having actually started transitioning. */
const TRANSITION_STEP_KEYS = [
  "only_social_transition",
  "took_hormones",
  "diy_hormones",
  "took_puberty_blockers",
  "top_surgery",
  "bottom_surgery",
  "facial_surgery",
] as const;

/** Any of these marks a story as outside the stats population. */
const NOT_DETRANSITIONED_KEYS = [
  "never_transitioned",
  "still_identifies_trans",
  "no_detransition_occurred",
];

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
    -- Ages outside 0-120 are extraction errors (usually a year read as an
    -- age); null them so every chart and highlight drops them alike.
    latest_timelines AS (
      SELECT DISTINCT ON (username)
        username,
        CASE WHEN transition_age BETWEEN 0 AND 120 THEN transition_age END AS transition_age,
        CASE WHEN detransition_age BETWEEN 0 AND 120 THEN detransition_age END AS detransition_age,
        CASE WHEN first_dysphoria_age BETWEEN 0 AND 120 THEN first_dysphoria_age END AS first_dysphoria_age,
        CASE WHEN hormones_age BETWEEN 0 AND 120 THEN hormones_age END AS hormones_age,
        CASE WHEN puberty_blockers_age BETWEEN 0 AND 120 THEN puberty_blockers_age END AS puberty_blockers_age,
        CASE WHEN top_surgery_age BETWEEN 0 AND 120 THEN top_surgery_age END AS top_surgery_age,
        CASE WHEN bottom_surgery_age BETWEEN 0 AND 120 THEN bottom_surgery_age END AS bottom_surgery_age,
        transition_year,
        detransition_year
      FROM detrans_user_timelines
      ORDER BY username, run_id DESC
    ),
    transition_evidence AS MATERIALIZED (
      SELECT DISTINCT ea.username
      FROM answers ea
      JOIN detrans_features ef ON ef.id = ea.feature_id
      WHERE ef.key IN (${sql.join(
        TRANSITION_STEP_KEYS.map((key) => sql`${key}`),
        sql`, `,
      )})
        AND ea.noul >= COALESCE(ef.threshold, ${DEFAULT_NOUL_THRESHOLD})
    ),
    stats_status AS MATERIALIZED (
      SELECT sa.username
      FROM answers sa
      JOIN detrans_features sf ON sf.id = sa.feature_id
      WHERE sf.key = 'current_status'
        AND (
          sa.choice = 'detransitioned'
          OR (
            sa.choice = 'desisted'
            AND sa.username IN (SELECT username FROM transition_evidence)
          )
        )
    ),
    not_detransitioned AS MATERIALIZED (
      SELECT na.username
      FROM answers na
      JOIN detrans_features nf ON nf.id = na.feature_id
      WHERE nf.key IN (${sql.join(
        NOT_DETRANSITIONED_KEYS.map((key) => sql`${key}`),
        sql`, `,
      )})
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
        SELECT 1 FROM not_detransitioned nd WHERE nd.username = a.username
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

/**
 * When selecting a threshold to compare in JS, cast it `::real` (the column
 * type), never `::float`: 0.8::real::float is 0.800000011920929, which drops
 * answers scored exactly at the threshold.
 */
export const NOUL_THRESHOLD = DEFAULT_NOUL_THRESHOLD;

/** Features that place a story on the medical-involvement ladder. */
export const MEDICAL_TIER_KEYS = [
  "never_transitioned",
  ...TRANSITION_STEP_KEYS,
] as const;

export type MedicalTier =
  | "no_transition"
  | "social_only"
  | "hormones"
  | "surgery"
  | "unclear";

/** The most invasive step a story reached, from its yes/no answers. */
export function medicalTier(truth: (key: string) => boolean): MedicalTier {
  if (
    truth("top_surgery") ||
    truth("bottom_surgery") ||
    truth("facial_surgery")
  )
    return "surgery";
  if (
    truth("took_hormones") ||
    truth("diy_hormones") ||
    truth("took_puberty_blockers")
  )
    return "hormones";
  if (truth("only_social_transition")) return "social_only";
  if (truth("never_transitioned")) return "no_transition";
  return "unclear";
}
