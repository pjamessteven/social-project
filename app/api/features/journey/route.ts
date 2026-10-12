import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

const MILESTONES = [
  "first_dysphoria_age",
  "transition_age",
  "hormones_age",
  "detransition_age",
] as const;

type MilestoneColumn = (typeof MILESTONES)[number];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Age distributions for the main journey milestones across the filtered
 * cohort. Powers the "Journey" ridgeline of mini histograms.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          t.first_dysphoria_age,
          t.transition_age,
          t.hormones_age,
          t.detransition_age,
          t.transition_year,
          t.detransition_year
        FROM latest_timelines t
        WHERE t.username IN (SELECT username FROM cohort)
      `),
    ) as unknown as (Record<MilestoneColumn, number | null> & {
      transition_year: number | null;
      detransition_year: number | null;
    })[];

    const cohortRow = rows.length;

    const milestones = MILESTONES.map((column) => {
      const ages = rows
        .map((row) => row[column])
        .filter(
          (age): age is number =>
            typeof age === "number" && age >= 0 && age <= 120,
        );
      const counts = new Map<number, number>();
      for (const age of ages) {
        counts.set(age, (counts.get(age) ?? 0) + 1);
      }
      const points = [...counts.entries()]
        .map(([age, count]) => ({ age, count }))
        .sort((a, b) => a.age - b.age);
      return {
        key: column,
        n: ages.length,
        median: median(ages),
        min: points[0]?.age ?? null,
        max: points[points.length - 1]?.age ?? null,
        counts: points,
      };
    });

    // Years spent in transition (year difference, age difference fallback).
    const durations = rows
      .map((row) => {
        if (row.transition_year != null && row.detransition_year != null) {
          return row.detransition_year - row.transition_year;
        }
        if (row.transition_age != null && row.detransition_age != null) {
          return row.detransition_age - row.transition_age;
        }
        return null;
      })
      .filter(
        (value): value is number => value != null && value >= 0 && value <= 40,
      );
    const durationCounts = new Map<number, number>();
    for (const value of durations) {
      durationCounts.set(value, (durationCounts.get(value) ?? 0) + 1);
    }
    const durationPoints = [...durationCounts.entries()]
      .map(([years, count]) => ({ age: years, count }))
      .sort((a, b) => a.age - b.age);
    const duration = {
      n: durations.length,
      median: median(durations),
      min: durationPoints[0]?.age ?? null,
      max: durationPoints[durationPoints.length - 1]?.age ?? null,
      counts: durationPoints,
    };

    return NextResponse.json(
      { cohort: cohortRow, milestones, duration },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching journey data:", error);
    return NextResponse.json(
      { error: "Failed to fetch journey data" },
      { status: 500 },
    );
  }
}
