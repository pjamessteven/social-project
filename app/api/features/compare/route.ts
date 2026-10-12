import { db } from "@/db";
import { sql, type SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  NOUL_THRESHOLD,
  parseFeatureFilters,
} from "../helpers";

interface SplitInfo {
  key: string;
  label: string;
  mode: "feature" | "sex" | "age";
  threshold: number | null;
  nTrue: number;
  nFalse: number;
  /** "all" splits every answer; "clear" excludes the unclear band. */
  filter: "all" | "clear";
  excluded: number;
}

/**
 * Cohort split comparison: divides the filtered cohort into two halves —
 * "feature true" vs "feature false" at the split feature's threshold, or
 * women vs men when split=sex — then returns the prevalence of every other
 * yes/no feature in both halves. Powers the dumbbell "Compare" view.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const { searchParams } = new URL(request.url);
    const splitKey = searchParams.get("split");
    if (!splitKey) {
      return NextResponse.json(
        { error: "split parameter is required" },
        { status: 400 },
      );
    }

    const isSexSplit = splitKey === "sex";
    const isAgeSplit = splitKey === "transition_age";
    const splitMode: "all" | "clear" =
      searchParams.get("mode") === "clear" ? "clear" : "all";
    let splitFeature: Record<string, unknown> | null = null;
    let splitId = 0;
    let threshold = NOUL_THRESHOLD;

    if (!isSexSplit && !isAgeSplit) {
      const [feature] = Array.from(
        await db.execute(sql`
          SELECT
            id,
            key,
            label,
            COALESCE(threshold, ${NOUL_THRESHOLD})::real AS threshold
          FROM detrans_features
          WHERE key = ${splitKey} AND enabled = true AND kind = 'noul'
          LIMIT 1
        `),
      ) as Record<string, unknown>[];

      if (!feature) {
        return NextResponse.json(
          { error: "Split feature not found or not a yes/no feature" },
          { status: 404 },
        );
      }
      splitFeature = feature;
      splitId = Number(feature.id);
      threshold =
        Math.round(Number(feature.threshold ?? NOUL_THRESHOLD) * 100) / 100;
    }

    const splitCte: SQL = isSexSplit
      ? sql`
        split AS (
          SELECT fu.username, (fu.sex = 'f') AS is_true, false AS is_unclear
          FROM filtered_users fu
          WHERE fu.sex IS NOT NULL
            AND fu.username IN (SELECT username FROM cohort)
        )
      `
      : isAgeSplit
        ? sql`
        split AS (
          SELECT t.username, (t.transition_age < 18) AS is_true, false AS is_unclear
          FROM latest_timelines t
          JOIN cohort c ON c.username = t.username
          WHERE t.transition_age IS NOT NULL
        )
      `
        : sql`
        split AS (
          SELECT
            a.username,
            (a.noul >= ${threshold}) AS is_true,
            (a.noul >= 0.2 AND a.noul < ${threshold}) AS is_unclear
          FROM filtered_answers a
          WHERE a.feature_id = ${splitId}
            AND a.kind = 'noul'
        )
      `;

    const clearOnly = splitMode === "clear" && !isSexSplit && !isAgeSplit;

    const [countsRow] = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)},
        ${splitCte}
        SELECT
          (count(*) FILTER (WHERE is_true))::int AS "nTrue",
          (
            count(*) FILTER (
              WHERE NOT is_true
                ${clearOnly ? sql`AND NOT is_unclear` : sql``}
            )
          )::int AS "nFalse",
          (count(*) FILTER (WHERE is_unclear))::int AS excluded
        FROM split
      `),
    ) as unknown as { nTrue: number; nFalse: number; excluded: number }[];

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)},
        ${splitCte}
        SELECT
          f.key,
          f.label,
          f."group",
          f.tier,
          (count(*) FILTER (WHERE s.is_true))::int AS "nTrue",
          (
            count(*) FILTER (
              WHERE s.is_true AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS "aboveTrue",
          (count(*) FILTER (WHERE NOT s.is_true))::int AS "nFalse",
          (
            count(*) FILTER (
              WHERE NOT s.is_true AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS "aboveFalse"
        FROM split s
        JOIN filtered_answers a ON a.username = s.username
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.kind = 'noul'
          ${isSexSplit || isAgeSplit ? sql`` : sql`AND f.key <> ${splitKey}`}
          ${clearOnly ? sql`AND NOT s.is_unclear` : sql``}
        GROUP BY f.id
      `),
    ) as Record<string, unknown>[];

    const features = rows
      .map((row) => {
        const nTrue = Number(row.nTrue);
        const nFalse = Number(row.nFalse);
        const aboveTrue = Number(row.aboveTrue);
        const aboveFalse = Number(row.aboveFalse);
        const rateTrue = nTrue > 0 ? aboveTrue / nTrue : 0;
        const rateFalse = nFalse > 0 ? aboveFalse / nFalse : 0;
        return {
          key: row.key as string,
          label: row.label as string,
          group: row.group as string,
          tier: row.tier as string,
          nTrue,
          nFalse,
          rateTrue,
          rateFalse,
          diff: rateTrue - rateFalse,
        };
      })
      .filter((row) => row.nTrue + row.nFalse > 0)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    const split: SplitInfo = isSexSplit
      ? {
          key: "sex",
          label: "sex",
          mode: "sex",
          threshold: null,
          nTrue: Number(countsRow?.nTrue ?? 0),
          nFalse: Number(countsRow?.nFalse ?? 0),
          filter: splitMode,
          excluded: 0,
        }
      : isAgeSplit
        ? {
            key: "transition_age",
            label: "transition_age",
            mode: "age",
            threshold: null,
            nTrue: Number(countsRow?.nTrue ?? 0),
            nFalse: Number(countsRow?.nFalse ?? 0),
            filter: splitMode,
            excluded: 0,
          }
        : {
            key: splitFeature!.key as string,
            label: splitFeature!.label as string,
            mode: "feature",
            threshold,
            nTrue: Number(countsRow?.nTrue ?? 0),
            nFalse: Number(countsRow?.nFalse ?? 0),
            filter: splitMode,
            excluded: Number(countsRow?.excluded ?? 0),
          };

    return NextResponse.json(
      {
        cohort: split.nTrue + split.nFalse,
        split,
        features,
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching feature comparison:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature comparison" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
