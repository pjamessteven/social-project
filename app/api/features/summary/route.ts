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
 * Per-feature aggregate stats for the current filter cohort.
 *
 * Returns one row per enabled feature with enough data to render the
 * explorer list (prevalence at threshold, modal choice, mean score) without
 * fetching each feature individually.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          f.id,
          f.key,
          f.label,
          f."group",
          f.tier,
          f.kind,
          f.tag_name AS "tagName",
          COALESCE(f.threshold, ${NOUL_THRESHOLD})::real AS threshold,
          (
            CASE
              WHEN jsonb_typeof(f.question->'criteria') = 'array'
                THEN jsonb_array_length(f.question->'criteria')
            END
          )::int AS "scoreLevels",
          count(a.username)::int AS n,
          (
            count(*) FILTER (
              WHERE a.kind = 'noul'
                AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS "nAbove",
          (
            count(*) FILTER (
              WHERE a.kind = 'noul'
                AND a.noul > 0.2
                AND a.noul < COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS "nUncertain",
          (count(*) FILTER (WHERE a.kind = 'noul' AND fu.sex = 'f'))::int AS "nF",
          (
            count(*) FILTER (
              WHERE a.kind = 'noul' AND fu.sex = 'f'
                AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS "aboveF",
          (count(*) FILTER (WHERE a.kind = 'noul' AND fu.sex = 'm'))::int AS "nM",
          (
            count(*) FILTER (
              WHERE a.kind = 'noul' AND fu.sex = 'm'
                AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
            )
          )::int AS "aboveM",
          (avg(a.noul) FILTER (WHERE a.kind = 'noul'))::float AS "meanNoul",
          (avg(a.score) FILTER (WHERE a.kind = 'score'))::float AS "meanScore",
          (avg(a.confidence))::float AS confidence,
          modal.choice AS "modalChoice",
          modal.c AS "modalCount"
        FROM detrans_features f
        LEFT JOIN filtered_answers a
          ON a.feature_id = f.id
        LEFT JOIN filtered_users fu ON fu.username = a.username
        LEFT JOIN LATERAL (
          SELECT a2.choice, (count(*))::int AS c
          FROM filtered_answers a2
          WHERE a2.feature_id = f.id
            AND a2.kind = 'choice'
          GROUP BY a2.choice
          ORDER BY c DESC, a2.choice
          LIMIT 1
        ) modal ON TRUE
        WHERE f.enabled = true
        GROUP BY f.id, modal.choice, modal.c
        ORDER BY f.tier, f."group", f.key
      `),
    ) as Record<string, unknown>[];

    const [cohortRow] = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT count(*)::int AS c FROM cohort
      `),
    ) as { c: number }[];

    const features = rows.map((row) => {
      const n = Number(row.n ?? 0);
      const nAbove = Number(row.nAbove ?? 0);
      const cohort = Number(cohortRow?.c ?? 0);
      return {
        key: row.key as string,
        label: row.label as string,
        group: row.group as string,
        tier: row.tier as string,
        kind: row.kind as string,
        tagName: (row.tagName as string | null) ?? null,
        threshold:
          Math.round(Number(row.threshold ?? NOUL_THRESHOLD) * 100) / 100,
        scoreLevels: row.scoreLevels == null ? null : Number(row.scoreLevels),
        n,
        nAbove,
        nUncertain: Number(row.nUncertain ?? 0),
        bySex: {
          f: { n: Number(row.nF ?? 0), above: Number(row.aboveF ?? 0) },
          m: { n: Number(row.nM ?? 0), above: Number(row.aboveM ?? 0) },
        },
        meanNoul: row.meanNoul == null ? null : Number(row.meanNoul),
        meanScore: row.meanScore == null ? null : Number(row.meanScore),
        confidence: row.confidence == null ? null : Number(row.confidence),
        modalChoice: (row.modalChoice as string | null) ?? null,
        modalCount: row.modalCount == null ? null : Number(row.modalCount),
        coverage: cohort > 0 ? n / cohort : 0,
        prevalence: n > 0 && row.kind === "noul" ? nAbove / n : null,
      };
    });

    return NextResponse.json(
      { cohort: Number(cohortRow?.c ?? 0), features },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching feature summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature summary" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
