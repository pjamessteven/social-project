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

interface AnswerRow {
  noul: number | null;
  choice: string | null;
  score: number | null;
  confidence: number | null;
  probabilities: Record<string, number> | null;
}

interface QuestionShape {
  instructions?: string;
  criteria?: string[] | Record<string, string | null>;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Full distribution for a single feature, used by the explorer detail pane
 * and the reasons section. Aggregation happens in TS on purpose: rows per
 * feature are bounded by the cohort size, and choice/score answers carry
 * JSONB probability payloads that are far easier to merge here than in SQL.
 */
async function getFeature(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    const filters = parseFeatureFilters(request);
    const { searchParams } = new URL(request.url);
    const thresholdOverride = Number.parseFloat(
      searchParams.get("threshold") ?? "",
    );

    const [feature] = Array.from(
      await db.execute(sql`
        SELECT
          id,
          key,
          label,
          "group",
          tier,
          kind,
          question,
          tag_name AS "tagName",
          tag_type AS "tagType",
          choice_tag_map AS "choiceTagMap",
          COALESCE(threshold, ${NOUL_THRESHOLD})::real AS threshold
        FROM detrans_features
        WHERE key = ${key} AND enabled = true
        LIMIT 1
      `),
    ) as Record<string, unknown>[];

    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    const kind = feature.kind as string;
    const question = (feature.question ?? {}) as QuestionShape;
    const featureId = Number(feature.id);
    const threshold = Number.isFinite(thresholdOverride)
      ? Math.min(Math.max(thresholdOverride, 0.5), 0.99)
      : Math.round(Number(feature.threshold ?? NOUL_THRESHOLD) * 100) / 100;

    const answers = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          a.noul,
          a.choice,
          a.score,
          a.confidence,
          a.probabilities
        FROM filtered_answers a
        WHERE a.feature_id = ${featureId}
      `),
    ) as unknown as AnswerRow[];

    const [cohortRow] = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT count(*)::int AS c FROM cohort
      `),
    ) as { c: number }[];

    const cohort = Number(cohortRow?.c ?? 0);
    const n = answers.length;

    const response: Record<string, unknown> = {
      feature: {
        key: feature.key,
        label: feature.label,
        group: feature.group,
        tier: feature.tier,
        kind,
        tagName: (feature.tagName as string | null) ?? null,
        tagType: (feature.tagType as string | null) ?? null,
        threshold,
        question,
        choiceTagMap: feature.choiceTagMap ?? null,
      },
      cohort,
      n,
      coverage: cohort > 0 ? n / cohort : 0,
    };

    const confidences = answers
      .map((a) => a.confidence)
      .filter((c): c is number => typeof c === "number");

    if (kind === "noul") {
      const values = answers
        .map((a) => a.noul)
        .filter((v): v is number => typeof v === "number");
      const buckets = Array.from({ length: 10 }, (_, index) => ({
        from: index / 10,
        to: (index + 1) / 10,
        count: 0,
      }));
      for (const value of values) {
        const index = Math.min(9, Math.max(0, Math.floor(value * 10)));
        buckets[index].count += 1;
      }
      response.noul = {
        buckets,
        mean: values.length
          ? round(values.reduce((a, b) => a + b, 0) / values.length)
          : null,
        median: median(values),
        nAbove: values.filter((v) => v >= threshold).length,
        nUncertain: values.filter((v) => v > 0.2 && v < threshold).length,
        nBelow: values.filter((v) => v <= 0.2).length,
        nValues: values.length,
      };
    }

    if (kind === "choice") {
      const criteria =
        question.criteria && !Array.isArray(question.criteria)
          ? (question.criteria as Record<string, string | null>)
          : {};
      const hard = new Map<string, number>();
      const soft = new Map<string, number>();
      let withProbabilities = 0;
      for (const answer of answers) {
        if (answer.choice) {
          hard.set(answer.choice, (hard.get(answer.choice) ?? 0) + 1);
        }
        const probabilities =
          answer.probabilities && typeof answer.probabilities === "object"
            ? answer.probabilities
            : null;
        if (probabilities) {
          withProbabilities += 1;
          for (const [option, probability] of Object.entries(probabilities)) {
            if (typeof probability !== "number") continue;
            soft.set(option, (soft.get(option) ?? 0) + probability);
          }
        } else if (answer.choice) {
          // Older runs without probability payloads fall back to hard counts.
          soft.set(answer.choice, (soft.get(answer.choice) ?? 0) + 1);
        }
      }
      const optionKeys = new Set<string>([
        ...Object.keys(criteria),
        ...hard.keys(),
        ...soft.keys(),
      ]);
      response.choice = {
        options: [...optionKeys].map((optionKey) => ({
          key: optionKey,
          hard: hard.get(optionKey) ?? 0,
          soft: round(soft.get(optionKey) ?? 0),
          description: criteria[optionKey] ?? null,
        })),
        nChoice: answers.filter((a) => a.choice).length,
        nWithProbabilities: withProbabilities,
      };
    }

    if (kind === "score") {
      const criteria = Array.isArray(question.criteria)
        ? question.criteria
        : [];
      const levels = Math.max(criteria.length, 2);
      const max = levels - 1;
      const binCount = 10;
      const binWidth = max / binCount;
      const bins = Array.from({ length: binCount }, (_, index) => ({
        from: round(index * binWidth),
        to: round((index + 1) * binWidth),
        count: 0,
      }));
      const values = answers
        .map((a) => a.score)
        .filter((v): v is number => typeof v === "number");
      for (const value of values) {
        const clamped = Math.min(Math.max(value, 0), max);
        const index = Math.min(binCount - 1, Math.floor(clamped / binWidth));
        bins[index].count += 1;
      }
      response.score = {
        levels: criteria,
        min: 0,
        max,
        bins,
        mean: values.length
          ? round(values.reduce((a, b) => a + b, 0) / values.length)
          : null,
        median: median(values),
        nValues: values.length,
      };
    }

    if (confidences.length > 0) {
      response.confidence = {
        mean: round(
          confidences.reduce((a, b) => a + b, 0) / confidences.length,
        ),
        median: median(confidences),
        n: confidences.length,
      };
    }

    // Related features: among stories where this noul feature is true, which
    // other features are most over-represented vs. the whole cohort.
    if (kind === "noul" && n >= 5) {
      const relatedRows = Array.from(
        await db.execute(sql`
          WITH ${cohortCte(filters)},
          target AS (
            SELECT a.username
            FROM filtered_answers a
            WHERE a.feature_id = ${featureId}
              AND a.kind = 'noul'
              AND a.noul >= ${threshold}
          ),
          co AS (
            SELECT
              a2.feature_id,
              (
                count(*) FILTER (
                  WHERE a2.kind = 'noul'
                    AND a2.noul >= COALESCE(f2.threshold, ${NOUL_THRESHOLD})
                )
              )::int AS above,
              count(a2.username)::int AS n
            FROM target t
            JOIN filtered_answers a2 ON a2.username = t.username
            JOIN detrans_features f2 ON f2.id = a2.feature_id
            WHERE a2.feature_id <> ${featureId} AND f2.enabled = true
            GROUP BY a2.feature_id
          ),
          baseline AS (
            SELECT
              a2.feature_id,
              (
                count(*) FILTER (
                  WHERE a2.kind = 'noul'
                    AND a2.noul >= COALESCE(f2.threshold, ${NOUL_THRESHOLD})
                )
              )::int AS above,
              count(a2.username)::int AS n
            FROM filtered_answers a2
            JOIN detrans_features f2 ON f2.id = a2.feature_id
            WHERE f2.enabled = true
            GROUP BY a2.feature_id
          )
          SELECT
            f.key,
            f.label,
            f.tier,
            co.n AS "targetN",
            co.above AS "targetAbove",
            baseline.n AS "baseN",
            baseline.above AS "baseAbove"
          FROM co
          JOIN baseline ON baseline.feature_id = co.feature_id
          JOIN detrans_features f ON f.id = co.feature_id
          WHERE co.n >= 5 AND co.above > 0
        `),
      ) as Record<string, unknown>[];

      const related = relatedRows
        .map((row) => {
          const targetN = Number(row.targetN);
          const targetAbove = Number(row.targetAbove);
          const baseN = Number(row.baseN);
          const baseAbove = Number(row.baseAbove);
          const rate = targetN > 0 ? targetAbove / targetN : 0;
          const baseRate = baseN > 0 ? baseAbove / baseN : 0;
          return {
            key: row.key as string,
            label: row.label as string,
            tier: row.tier as string,
            targetN,
            rate: round(rate),
            lift: baseRate > 0 ? round(rate / baseRate, 2) : null,
          };
        })
        .filter((row) => row.lift !== null && row.lift >= 1.2)
        .sort((a, b) => (b.lift ?? 0) - (a.lift ?? 0))
        .slice(0, 5);

      response.related = related;
    } else {
      response.related = [];
    }

    return NextResponse.json(response, { headers: FEATURE_CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching feature detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature detail" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
