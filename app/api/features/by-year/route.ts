import { bucketFor, YEAR_BUCKETS } from "@/app/lib/year-buckets";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

/**
 * Choice-feature distribution per transition-year cohort, e.g. the main
 * reason for transitioning or the most influential platform by era.
 *
 * Shares are probability-weighted (each story spreads one unit across its
 * options), matching the soft distributions elsewhere on /stats. `exclude`
 * drops options (e.g. "none") before shares are computed.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") ?? "";
    if (!/^[a-z0-9_]{1,100}$/.test(key)) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    const exclude = new Set(
      (searchParams.get("exclude") ?? "")
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean),
    );

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT t.transition_year AS year, a.choice, a.probabilities
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        JOIN latest_timelines t ON t.username = a.username
        WHERE f.key = ${key}
          AND f.kind = 'choice'
          AND f.enabled = true
          AND t.transition_year IS NOT NULL
      `),
    ) as unknown as {
      year: number;
      choice: string | null;
      probabilities: Record<string, number> | null;
    }[];

    const byBucket = new Map<
      string,
      { n: number; mass: Map<string, number> }
    >();
    const totals = new Map<string, number>();

    for (const row of rows) {
      const bucket = bucketFor(Number(row.year));
      if (!bucket) continue;
      const weights: [string, number][] =
        row.probabilities && typeof row.probabilities === "object"
          ? Object.entries(row.probabilities).filter(
              (entry): entry is [string, number] =>
                typeof entry[1] === "number",
            )
          : row.choice
            ? [[row.choice, 1]]
            : [];
      const kept = weights.filter(([option]) => !exclude.has(option));
      const keptMass = kept.reduce((sum, [, value]) => sum + value, 0);
      if (keptMass <= 0) continue;

      const entry = byBucket.get(bucket) ?? { n: 0, mass: new Map() };
      // Re-normalise so each story still counts once after exclusions.
      for (const [option, value] of kept) {
        const share = value / keptMass;
        entry.mass.set(option, (entry.mass.get(option) ?? 0) + share);
        totals.set(option, (totals.get(option) ?? 0) + share);
      }
      entry.n += 1;
      byBucket.set(bucket, entry);
    }

    const options = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([option]) => option);

    const buckets = YEAR_BUCKETS.map((bucket) => {
      const entry = byBucket.get(bucket.key);
      const n = entry?.n ?? 0;
      return {
        key: bucket.key,
        from: bucket.from,
        to: bucket.to,
        n,
        shares: Object.fromEntries(
          options.map((option) => [
            option,
            n > 0 ? (entry!.mass.get(option) ?? 0) / n : 0,
          ]),
        ),
      };
    });

    return NextResponse.json(
      { key, options, buckets },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching by-year distribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch by-year distribution" },
      { status: 500 },
    );
  }
}
