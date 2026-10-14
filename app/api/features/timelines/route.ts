import { transitionYears } from "@/app/lib/stats-math";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

type Age = number | null;

/** Column order of each row in the response (compact arrays, no ids). */
const COLUMNS = [
  "sex",
  "firstDysphoria",
  "pubertyBlockers",
  "hormones",
  "transition",
  "topSurgery",
  "bottomSurgery",
  "detransition",
  "years",
] as const;

function age(value: unknown): Age {
  return typeof value === "number" && value >= 0 && value <= 100 ? value : null;
}

/**
 * Anonymous per-person milestone ages for the individual-timelines strip
 * chart and the time-to-detransition curve. Rows carry no usernames or ids
 * and are returned in a hashed order, only for people with at least a
 * transition age or a usable transition duration.
 *
 * `years` is time from transition to detransition: year difference when
 * both years are known, age difference otherwise.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          fu.sex,
          t.first_dysphoria_age,
          t.puberty_blockers_age,
          t.hormones_age,
          t.transition_age,
          t.top_surgery_age,
          t.bottom_surgery_age,
          t.detransition_age,
          t.transition_year,
          t.detransition_year
        FROM latest_timelines t
        JOIN cohort c ON c.username = t.username
        LEFT JOIN filtered_users fu ON fu.username = t.username
        ORDER BY md5(t.username)
      `),
    ) as Record<string, unknown>[];

    const out: (string | number | null)[][] = [];
    for (const row of rows) {
      const transition = age(row.transition_age);
      const detransition = age(row.detransition_age);
      const years = transitionYears({
        transitionYear: row.transition_year,
        detransitionYear: row.detransition_year,
        transitionAge: transition,
        detransitionAge: detransition,
      });
      if (transition == null && years == null) continue;

      out.push([
        row.sex === "f" || row.sex === "m" ? row.sex : null,
        age(row.first_dysphoria_age),
        age(row.puberty_blockers_age),
        age(row.hormones_age),
        transition,
        age(row.top_surgery_age),
        age(row.bottom_surgery_age),
        detransition,
        years,
      ]);
    }

    return NextResponse.json(
      { columns: COLUMNS, rows: out },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching timelines:", error);
    return NextResponse.json(
      { error: "Failed to fetch timelines" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
