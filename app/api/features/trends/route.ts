import { bucketFor, YEAR_BUCKETS } from "@/app/lib/year-buckets";
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

const DEFAULT_TREND_KEYS = [
  "mh_anxiety",
  "top_surgery",
  "adv_childhood_abuse",
  "internalised_misogyny_misandry",
  "contributed_online_influence",
];

const MAX_SERIES = 5;

function parseSeriesKeys(raw: string | null): string[] {
  if (!raw) return DEFAULT_TREND_KEYS;
  const keys = [
    ...new Set(
      raw
        .split(",")
        .map((key) => key.trim())
        .filter((key) => /^[a-z0-9_]{1,100}$/.test(key)),
    ),
  ].slice(0, MAX_SERIES);
  return keys.length > 0 ? keys : DEFAULT_TREND_KEYS;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Feature shares by transition-year cohort: how the reasons behind transition
 * and its outcomes differ across eras of the dataset.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const seriesKeys = parseSeriesKeys(
      new URL(request.url).searchParams.get("keys"),
    );

    const [timelineRowsRaw, answerRowsRaw] = await Promise.all([
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT t.username, t.transition_year, t.transition_age
        FROM latest_timelines t
        JOIN cohort c ON c.username = t.username
        WHERE t.transition_year IS NOT NULL
      `),
      db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          a.username,
          f.key,
          a.noul,
          COALESCE(f.threshold, ${NOUL_THRESHOLD})::real AS threshold
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.kind = 'noul'
          AND f.key IN (${sql.join(
            seriesKeys.map((key) => sql`${key}`),
            sql`, `,
          )})
      `),
    ]);

    const timelineRows = Array.from(timelineRowsRaw) as unknown as {
      username: string;
      transition_year: number | null;
      transition_age: number | null;
    }[];
    const answerRows = Array.from(answerRowsRaw) as unknown as {
      username: string;
      key: string;
      noul: number | null;
      threshold: number;
    }[];

    const bucketByUser = new Map<string, string>();
    const agesByBucket = new Map<string, number[]>();
    for (const row of timelineRows) {
      if (typeof row.transition_year !== "number") continue;
      const bucket = bucketFor(row.transition_year);
      if (!bucket) continue;
      bucketByUser.set(row.username, bucket);
      if (typeof row.transition_age === "number") {
        const ages = agesByBucket.get(bucket) ?? [];
        ages.push(row.transition_age);
        agesByBucket.set(bucket, ages);
      }
    }

    const stats = new Map<
      string,
      Map<string, { answered: number; above: number; sum: number }>
    >();
    for (const row of answerRows) {
      const bucket = bucketByUser.get(row.username);
      if (!bucket) continue;
      let byKey = stats.get(bucket);
      if (!byKey) {
        byKey = new Map();
        stats.set(bucket, byKey);
      }
      const entry = byKey.get(row.key) ?? { answered: 0, above: 0, sum: 0 };
      entry.answered += 1;
      if (typeof row.noul === "number") {
        entry.sum += row.noul;
        if (row.noul >= row.threshold) entry.above += 1;
      }
      byKey.set(row.key, entry);
    }

    const buckets = YEAR_BUCKETS.map((bucket) => {
      const n = [...bucketByUser.values()].filter(
        (key) => key === bucket.key,
      ).length;
      const ages = agesByBucket.get(bucket.key) ?? [];
      return {
        key: bucket.key,
        from: bucket.from,
        to: bucket.to,
        n,
        medianAge: median(ages),
      };
    });

    const answeredKeys = new Set(answerRows.map((row) => row.key));
    const series = seriesKeys
      .filter((key) => answeredKeys.has(key))
      .map((key) => ({
        key,
        points: YEAR_BUCKETS.map((bucket) => {
          const entry = stats.get(bucket.key)?.get(key);
          if (!entry || entry.answered === 0) {
            return { bucketKey: bucket.key, above: 0, n: 0 };
          }
          return {
            bucketKey: bucket.key,
            above: entry.above,
            n: entry.answered,
          };
        }),
      }));

    return NextResponse.json(
      {
        cohort: bucketByUser.size,
        buckets,
        series,
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
