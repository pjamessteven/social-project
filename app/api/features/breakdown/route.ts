import { breakdownById } from "@/app/lib/feature-breakdowns";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  NOUL_THRESHOLD,
  parseFeatureFilters,
} from "../helpers";

interface DetailRow {
  key: string;
  label: string;
  question: { criteria?: string[] | Record<string, string | null> } | null;
  noul: number | null;
  choice: string | null;
  score: number | null;
  probabilities: Record<string, number> | null;
}

/** Distributes a continuous score across its two neighbouring levels. */
function spreadScore(
  value: number,
  maxLevel: number,
  soft: number[],
  hard: number[],
) {
  const clamped = Math.min(Math.max(value, 0), maxLevel);
  const lower = Math.floor(clamped);
  const fraction = clamped - lower;
  const upper = Math.min(lower + 1, maxLevel);
  if (lower === upper || fraction === 0) {
    soft[lower] += 1;
  } else {
    soft[lower] += 1 - fraction;
    soft[upper] += fraction;
  }
  hard[Math.min(maxLevel, Math.round(clamped))] += 1;
}

function buildChoiceDistribution(rows: DetailRow[]) {
  const question = rows[0]?.question;
  const criteria =
    question?.criteria && !Array.isArray(question.criteria)
      ? (question.criteria as Record<string, string | null>)
      : {};
  const hard = new Map<string, number>();
  const soft = new Map<string, number>();
  for (const row of rows) {
    if (row.choice) hard.set(row.choice, (hard.get(row.choice) ?? 0) + 1);
    const probabilities =
      row.probabilities && typeof row.probabilities === "object"
        ? row.probabilities
        : null;
    if (probabilities) {
      for (const [option, value] of Object.entries(probabilities)) {
        if (typeof value !== "number") continue;
        soft.set(option, (soft.get(option) ?? 0) + value);
      }
    } else if (row.choice) {
      soft.set(row.choice, (soft.get(row.choice) ?? 0) + 1);
    }
  }
  const optionKeys = new Set([
    ...Object.keys(criteria),
    ...hard.keys(),
    ...soft.keys(),
  ]);
  return {
    n: rows.length,
    options: [...optionKeys].map((key) => ({
      key,
      hard: hard.get(key) ?? 0,
      soft: Math.round((soft.get(key) ?? 0) * 10) / 10,
      description: criteria[key] ?? null,
    })),
  };
}

/**
 * Config-driven breakdown payload (see app/lib/feature-breakdowns.ts):
 * composition line, numeric scale distribution, choice distributions and
 * ranked statements for one view.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get("view");
    const view = viewId ? breakdownById(viewId) : undefined;
    if (!view) {
      return NextResponse.json({ error: "Unknown view" }, { status: 404 });
    }

    const filters = parseFeatureFilters(request);
    const detailKeys = [
      view.scoreKey,
      view.choiceKey,
      view.secondaryChoiceKey,
    ].filter((key): key is string => Boolean(key));

    const compositionQuery =
      view.composition.mode === "pair"
        ? db.execute(sql`
            WITH ${cohortCte(filters)},
            pos AS (
              SELECT id, COALESCE(threshold, ${NOUL_THRESHOLD}) AS threshold
              FROM detrans_features WHERE key = ${view.composition.positiveKey}
            ),
            neg AS (
              SELECT id, COALESCE(threshold, ${NOUL_THRESHOLD}) AS threshold
              FROM detrans_features WHERE key = ${view.composition.negativeKey}
            ),
            comp AS (
              SELECT
                a.username,
                bool_or(a.feature_id = pos.id AND a.noul >= pos.threshold) AS positive,
                bool_or(a.feature_id = neg.id AND a.noul >= neg.threshold) AS negative
              FROM filtered_answers a
              CROSS JOIN pos
              CROSS JOIN neg
              WHERE a.feature_id IN (pos.id, neg.id)
              GROUP BY a.username
            )
            SELECT
              count(*)::int AS n,
              (count(*) FILTER (WHERE positive))::int AS positive,
              (count(*) FILTER (WHERE negative AND NOT positive))::int AS negative
            FROM comp
          `)
        : view.composition.mode === "any" && view.statementKeys.length > 0
          ? db.execute(sql`
              WITH ${cohortCte(filters)},
              ids AS (
                SELECT id, COALESCE(threshold, ${NOUL_THRESHOLD}) AS threshold
                FROM detrans_features
                WHERE key IN (${sql.join(
                  view.statementKeys.map((key) => sql`${key}`),
                  sql`, `,
                )})
              ),
              comp AS (
                SELECT a.username, bool_or(a.noul >= ids.threshold) AS positive
                FROM filtered_answers a
                JOIN ids ON ids.id = a.feature_id
                GROUP BY a.username
              )
              SELECT
                count(*)::int AS n,
                (count(*) FILTER (WHERE positive))::int AS positive
              FROM comp
            `)
          : null;

    const [detailRowsRaw, statementRowsRaw, compositionRowRaw, cohortRowRaw] =
      await Promise.all([
        detailKeys.length > 0
          ? db.execute(sql`
              WITH ${cohortCte(filters)}
              SELECT
                f.key,
                f.label,
                f.question,
                a.noul,
                a.choice,
                a.score,
                a.probabilities
              FROM filtered_answers a
              JOIN detrans_features f ON f.id = a.feature_id
              WHERE f.enabled = true
                AND f.key IN (${sql.join(
                  detailKeys.map((key) => sql`${key}`),
                  sql`, `,
                )})
            `)
          : Promise.resolve([]),
        view.statementKeys.length > 0
          ? db.execute(sql`
              WITH ${cohortCte(filters)}
              SELECT
                f.key,
                f.label,
                f.tag_name AS "tagName",
                f.question->>'instructions' AS question,
                count(a.username)::int AS n,
                (
                  count(*) FILTER (WHERE a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD}))
                )::int AS above,
                (
                  count(*) FILTER (
                    WHERE a.noul >= 0.2
                      AND a.noul < COALESCE(f.threshold, ${NOUL_THRESHOLD})
                  )
                )::int AS mixed,
                (count(*) FILTER (WHERE fu.sex = 'f'))::int AS "nF",
                (
                  count(*) FILTER (
                    WHERE fu.sex = 'f'
                      AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
                  )
                )::int AS "aboveF",
                (count(*) FILTER (WHERE fu.sex = 'm'))::int AS "nM",
                (
                  count(*) FILTER (
                    WHERE fu.sex = 'm'
                      AND a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})
                  )
                )::int AS "aboveM"
              FROM filtered_answers a
              JOIN detrans_features f ON f.id = a.feature_id
              LEFT JOIN filtered_users fu ON fu.username = a.username
              WHERE f.enabled = true
                AND f.key IN (${sql.join(
                  view.statementKeys.map((key) => sql`${key}`),
                  sql`, `,
                )})
              GROUP BY f.id
            `)
          : Promise.resolve([]),
        compositionQuery ?? Promise.resolve([]),
        db.execute(sql`
          WITH ${cohortCte(filters)}
          SELECT count(*)::int AS c FROM cohort
        `),
      ]);

    const detailRows = Array.from(detailRowsRaw) as unknown as DetailRow[];
    const statementRows = Array.from(statementRowsRaw) as unknown as {
      key: string;
      label: string;
      tagName: string | null;
      question: string | null;
      n: number;
      above: number;
      mixed: number;
      nF: number;
      aboveF: number;
      nM: number;
      aboveM: number;
    }[];
    const [compositionRow] = Array.from(compositionRowRaw) as unknown as {
      n: number;
      positive: number;
      negative: number;
    }[];
    const [cohortRow] = Array.from(cohortRowRaw) as unknown as { c: number }[];

    // ── Scale ────────────────────────────────────────────────────────────
    let scale: Record<string, unknown> | null = null;
    if (view.scoreKey) {
      const rows = detailRows.filter((row) => row.key === view.scoreKey);
      const criteria = Array.isArray(rows[0]?.question?.criteria)
        ? (rows[0]!.question!.criteria as string[])
        : [];
      const maxLevel = Math.max(criteria.length - 1, 3);
      const softLevels = Array.from({ length: maxLevel + 1 }, () => 0);
      const hardLevels = Array.from({ length: maxLevel + 1 }, () => 0);
      const scores = rows
        .map((row) => row.score)
        .filter((score): score is number => typeof score === "number");
      for (const score of scores) {
        spreadScore(score, maxLevel, softLevels, hardLevels);
      }
      scale = {
        key: view.scoreKey,
        n: scores.length,
        mean:
          scores.length > 0
            ? Math.round(
                (scores.reduce((a, b) => a + b, 0) / scores.length) * 100,
              ) / 100
            : null,
        maxLevel,
        criteria,
        softLevels: softLevels.map((value) => Math.round(value * 10) / 10),
        hardLevels,
      };
    }

    // ── Choices ──────────────────────────────────────────────────────────
    const choice = view.choiceKey
      ? buildChoiceDistribution(
          detailRows.filter((row) => row.key === view.choiceKey),
        )
      : null;
    const secondaryChoice = view.secondaryChoiceKey
      ? buildChoiceDistribution(
          detailRows.filter((row) => row.key === view.secondaryChoiceKey),
        )
      : null;

    // ── Statements ───────────────────────────────────────────────────────
    const statements = view.statementKeys
      .map((key) => {
        const row = statementRows.find((candidate) => candidate.key === key);
        if (!row) return null;
        const n = Number(row.n);
        const above = Number(row.above);
        const mixed = Number(row.mixed);
        return {
          key,
          label: row.label,
          tagName: row.tagName,
          question: view.showQuestions ? row.question : null,
          n,
          above,
          mixed,
          prevalence: n > 0 ? above / n : 0,
          bySex: {
            f: { n: Number(row.nF), above: Number(row.aboveF) },
            m: { n: Number(row.nM), above: Number(row.aboveM) },
          },
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => (view.keepOrder ? 0 : b.prevalence - a.prevalence));

    // ── Composition ──────────────────────────────────────────────────────
    let composition: Record<string, unknown> | null = null;
    if (view.composition.mode === "pair" && compositionRow) {
      const n = Number(compositionRow.n);
      const positive = Number(compositionRow.positive);
      const negative = Number(compositionRow.negative);
      composition = {
        mode: "pair",
        positiveKey: view.composition.positiveKey,
        negativeKey: view.composition.negativeKey,
        positive,
        negative,
        notStated: Math.max(0, n - positive - negative),
        n,
      };
    } else if (view.composition.mode === "any" && compositionRow) {
      const n = Number(compositionRow.n);
      const positive = Number(compositionRow.positive);
      composition = {
        mode: "any",
        positive,
        negative: Math.max(0, n - positive),
        notStated: 0,
        n,
      };
    }

    return NextResponse.json(
      {
        cohort: Number(cohortRow?.c ?? 0),
        composition,
        scale,
        choice,
        secondaryChoice,
        statements,
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching breakdown data:", error);
    return NextResponse.json(
      { error: "Failed to fetch breakdown data" },
      { status: 500 },
    );
  }
}
