import { riskRatio } from "@/app/lib/stats-math";
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

const MAX_AXIS_KEYS = 10;

function parseKeys(raw: string | null): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_AXIS_KEYS);
}

/**
 * Co-occurrence matrix between two sets of yes/no features.
 *
 * Each cell is P(column true | row true) within the filtered cohort, the
 * risk ratio against stories without the row feature (with its 95%
 * interval), and the older lift against the column's cohort-wide base rate. Only yes/no features are
 * supported so every cell has the same interpretation.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const { searchParams } = new URL(request.url);
    const rowKeys = parseKeys(searchParams.get("rows"));
    const colKeys = parseKeys(searchParams.get("cols"));

    if (rowKeys.length === 0 || colKeys.length === 0) {
      return NextResponse.json(
        { error: "rows and cols parameters are required" },
        { status: 400 },
      );
    }

    const allKeys = [...new Set([...rowKeys, ...colKeys])];
    const keyList = sql.join(
      allKeys.map((key) => sql`${key}`),
      sql`, `,
    );
    const rowList = sql.join(
      rowKeys.map((key) => sql`${key}`),
      sql`, `,
    );
    const colList = sql.join(
      colKeys.map((key) => sql`${key}`),
      sql`, `,
    );

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)},
        truth AS (
          SELECT
            a.username,
            f.key,
            (a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})) AS is_true
          FROM filtered_answers a
          JOIN detrans_features f ON f.id = a.feature_id
          WHERE f.enabled = true
            AND f.kind = 'noul'
            AND f.key IN (${keyList})
        ),
        base AS (
          SELECT
            key,
            (avg(is_true::int))::float AS base_rate,
            (count(*))::int AS base_n
          FROM truth
          GROUP BY key
        )
        SELECT
          r.key AS "rowKey",
          c.key AS "colKey",
          (count(*) FILTER (WHERE r.is_true AND c.is_true))::int AS both,
          (count(*) FILTER (WHERE r.is_true))::int AS "rowN",
          (count(*) FILTER (WHERE NOT r.is_true AND c.is_true))::int AS "bothNot",
          (count(*) FILTER (WHERE NOT r.is_true))::int AS "notRowN",
          b.base_rate AS "baseRate",
          b.base_n AS "baseN"
        FROM truth r
        JOIN truth c ON c.username = r.username
        JOIN base b ON b.key = c.key
        WHERE r.key IN (${rowList}) AND c.key IN (${colList})
        GROUP BY r.key, c.key, b.base_rate, b.base_n
      `),
    ) as Record<string, unknown>[];

    const metaRows = Array.from(
      await db.execute(sql`
        SELECT key, label FROM detrans_features
        WHERE enabled = true AND kind = 'noul' AND key IN (${keyList})
      `),
    ) as { key: string; label: string }[];

    const [cohortRow] = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT count(*)::int AS c FROM cohort
      `),
    ) as { c: number }[];

    const labels = new Map(metaRows.map((row) => [row.key, row.label]));

    // Keep the requested order, drop keys that do not exist in this taxonomy.
    const toAxis = (keys: string[]) =>
      keys
        .filter((key) => labels.has(key))
        .map((key) => ({ key, label: labels.get(key)! }));

    const cells = rows.map((row) => {
      const rowN = Number(row.rowN);
      const both = Number(row.both);
      const baseRate = Number(row.baseRate);
      const notRowN = Number(row.notRowN);
      const bothNot = Number(row.bothNot);
      const rate = rowN > 0 ? both / rowN : 0;
      // Risk ratio against stories *without* the row feature, so a cell
      // reads "X× as common with the row feature as without it".
      const ratio = riskRatio(both, rowN, bothNot, notRowN);
      return {
        row: row.rowKey as string,
        col: row.colKey as string,
        rate,
        rateWithout: notRowN > 0 ? bothNot / notRowN : null,
        n: rowN,
        nWithout: notRowN,
        baseN: Number(row.baseN),
        lift: baseRate > 0 ? rate / baseRate : null,
        ratio: ratio?.ratio ?? null,
        ratioLow: ratio?.low ?? null,
        ratioHigh: ratio?.high ?? null,
      };
    });

    return NextResponse.json(
      {
        cohort: Number((cohortRow as { c: number })?.c ?? 0),
        rows: toAxis(rowKeys),
        cols: toAxis(colKeys),
        cells,
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching co-occurrence matrix:", error);
    return NextResponse.json(
      { error: "Failed to fetch co-occurrence matrix" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
