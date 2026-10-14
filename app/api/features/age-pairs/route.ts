import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

interface PairRow {
  transitionAge: number;
  detransitionAge: number;
  sex: string | null;
  count: number;
}

/**
 * Age at transition vs age at detransition for every story in the filtered
 * cohort that gives both, grouped by (ages, sex). Powers the dot plot in the
 * Ages section; same cohort and timeline ages as the journey curves.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          t.transition_age AS "transitionAge",
          t.detransition_age AS "detransitionAge",
          COALESCE(p.sex, du.sex) AS sex,
          count(*)::int AS count
        FROM latest_timelines t
        LEFT JOIN latest_profiles p ON p.username = t.username
        LEFT JOIN detrans_users du ON du.username = t.username
        WHERE t.username IN (SELECT username FROM cohort)
          AND t.transition_age IS NOT NULL
          AND t.detransition_age IS NOT NULL
          AND t.detransition_age >= t.transition_age
        GROUP BY 1, 2, 3
        ORDER BY 1, 2
      `),
    ) as unknown as PairRow[];

    const pairs = rows
      .filter((row) => row.sex === "f" || row.sex === "m")
      .map((row) => ({
        transitionAge: Number(row.transitionAge),
        detransitionAge: Number(row.detransitionAge),
        sex: row.sex as "f" | "m",
        count: Number(row.count),
      }));

    return NextResponse.json({ pairs }, { headers: FEATURE_CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching age pairs:", error);
    return NextResponse.json(
      { error: "Failed to fetch age pairs" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
