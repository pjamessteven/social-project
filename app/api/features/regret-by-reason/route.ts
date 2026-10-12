import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  NOUL_THRESHOLD,
  parseFeatureFilters,
} from "../helpers";

/**
 * Regret by main reason for transitioning. For each reason (each story's top
 * answer), counts the stories that clearly express regret and the stories
 * that clearly state either regret or no regret, so the share is "regret
 * among those who say", not diluted by stories that never mention it.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)},
        reasons AS (
          SELECT a.username, a.choice
          FROM filtered_answers a
          JOIN detrans_features f ON f.id = a.feature_id
          WHERE f.key = 'primary_transition_reason' AND a.choice IS NOT NULL
        ),
        regret AS (
          SELECT
            a.username,
            bool_or(f.key = 'regret_transition'
              AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})) AS regrets,
            bool_or(f.key = 'no_regret'
              AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})) AS no_regret
          FROM filtered_answers a
          JOIN detrans_features f ON f.id = a.feature_id
          WHERE f.key IN ('regret_transition', 'no_regret')
          GROUP BY a.username
        )
        SELECT
          r.choice AS key,
          count(*)::int AS n,
          (count(*) FILTER (WHERE g.regrets))::int AS regrets,
          (count(*) FILTER (WHERE g.regrets OR g.no_regret))::int AS stated
        FROM reasons r
        LEFT JOIN regret g ON g.username = r.username
        GROUP BY r.choice
      `),
    ) as unknown as {
      key: string;
      n: number;
      regrets: number;
      stated: number;
    }[];

    return NextResponse.json(
      {
        reasons: rows.map((row) => ({
          key: row.key,
          n: Number(row.n),
          regrets: Number(row.regrets),
          stated: Number(row.stated),
        })),
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching regret by reason:", error);
    return NextResponse.json(
      { error: "Failed to fetch regret by reason" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
