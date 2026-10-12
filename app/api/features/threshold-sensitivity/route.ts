import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95];
const MAX_KEYS = 6;

/**
 * How much a yes/no feature's share depends on the cut-off: the share of
 * stories at or above each probability threshold, plus the mean probability
 * (the share you would expect if every answer counted fractionally). Lets
 * readers see that the site's 0.8 cut-off is conservative, not inflating.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const keys = [
      ...new Set(
        (new URL(request.url).searchParams.get("keys") ?? "")
          .split(",")
          .map((key) => key.trim())
          .filter((key) => /^[a-z0-9_]{1,100}$/.test(key)),
      ),
    ].slice(0, MAX_KEYS);
    if (keys.length === 0) {
      return NextResponse.json({ error: "keys are required" }, { status: 400 });
    }

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          f.key,
          f.label,
          count(*)::int AS n,
          (avg(a.noul))::float AS mean,
          ${sql.join(
            THRESHOLDS.map(
              (threshold, index) =>
                sql`(count(*) FILTER (WHERE a.noul >= ${threshold}))::int AS ${sql.raw(`t${index}`)}`,
            ),
            sql`, `,
          )}
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.kind = 'noul'
          AND a.noul IS NOT NULL
          AND f.key IN (${sql.join(
            keys.map((key) => sql`${key}`),
            sql`, `,
          )})
        GROUP BY f.id
      `),
    ) as Record<string, unknown>[];

    const features = keys
      .map((key) => rows.find((row) => row.key === key))
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .map((row) => {
        const n = Number(row.n);
        return {
          key: row.key as string,
          label: row.label as string,
          n,
          mean: row.mean == null ? null : Number(row.mean),
          shares: THRESHOLDS.map((threshold, index) => ({
            threshold,
            share: n > 0 ? Number(row[`t${index}`]) / n : 0,
          })),
        };
      });

    return NextResponse.json(
      { thresholds: THRESHOLDS, features },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching threshold sensitivity:", error);
    return NextResponse.json(
      { error: "Failed to fetch threshold sensitivity" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
