import { bucketFor, YEAR_BUCKETS } from "@/app/lib/year-buckets";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

interface TimelineRow {
  username: string;
  sex: string | null;
  first_dysphoria_age: number | null;
  transition_age: number | null;
  hormones_age: number | null;
  puberty_blockers_age: number | null;
  detransition_age: number | null;
  transition_year: number | null;
}

// Median of the ages that were stated.
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * "Transition before 18": age coverage and early medical ages. These are
 * people who later detransitioned or desisted, so nothing here describes
 * people who stayed in transition.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          t.username,
          fu.sex,
          t.first_dysphoria_age,
          t.transition_age,
          t.hormones_age,
          t.puberty_blockers_age,
          t.detransition_age,
          t.transition_year
        FROM latest_timelines t
        JOIN cohort c ON c.username = t.username
        JOIN filtered_users fu ON fu.username = t.username
      `),
    ) as unknown as TimelineRow[];

    const minors = rows.filter(
      (row) => row.transition_age != null && row.transition_age < 18,
    );
    const adults = rows.filter(
      (row) => row.transition_age != null && row.transition_age >= 18,
    );
    const withAge = minors.length + adults.length;

    const ageIn = (pick: (row: TimelineRow) => number | null): number[] =>
      rows
        .map(pick)
        .filter((value): value is number => typeof value === "number");

    const transitionAges = ageIn((row) => row.transition_age);
    const dysphoriaAges = ageIn((row) => row.first_dysphoria_age);
    const hormoneAges = ageIn((row) => row.hormones_age);
    const blockerAges = ageIn((row) => row.puberty_blockers_age);
    const detransitionAges = ageIn((row) => row.detransition_age);

    // Share who started before 18, per transition-year cohort.
    const byEra = YEAR_BUCKETS.map((bucket) => {
      const inBucket = rows.filter(
        (row) =>
          row.transition_age != null &&
          row.transition_year != null &&
          bucketFor(row.transition_year) === bucket.key,
      );
      return {
        key: bucket.key,
        from: bucket.from,
        to: bucket.to,
        n: inBucket.length,
        minors: inBucket.filter((row) => (row.transition_age ?? 99) < 18)
          .length,
      };
    });

    const femaleMinorShare =
      minors.length > 0
        ? Math.round(
            (minors.filter((row) => row.sex === "f").length / minors.length) *
              100,
          )
        : 0;

    return NextResponse.json(
      {
        cohort: rows.length,
        coverage: { withAge, total: rows.length },
        byEra,
        tiles: {
          minorShare:
            withAge > 0 ? Math.round((minors.length / withAge) * 100) : 0,
          le15Share:
            transitionAges.length > 0
              ? Math.round(
                  (transitionAges.filter((age) => age <= 15).length /
                    transitionAges.length) *
                    100,
                )
              : 0,
          dysphoriaShare:
            dysphoriaAges.length > 0
              ? Math.round(
                  (dysphoriaAges.filter((age) => age <= 12).length /
                    dysphoriaAges.length) *
                    100,
                )
              : 0,
          dysphoriaN: dysphoriaAges.length,
          femaleMinorShare,
          blockers: {
            n: blockerAges.length,
            min: blockerAges.length > 0 ? Math.min(...blockerAges) : null,
            median: median(blockerAges),
          },
          hormonesLe16: hormoneAges.filter((age) => age <= 16).length,
          hormonesN: hormoneAges.length,
          detransitionLe18: detransitionAges.filter((age) => age <= 18).length,
          detransitionN: detransitionAges.length,
        },
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching early-transition data:", error);
    return NextResponse.json(
      { error: "Failed to fetch early-transition data" },
      { status: 500 },
    );
  }
}
