import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  parseFeatureFilters,
} from "../helpers";

const SCORE_KEYS = [
  "mh_change_after_detransition",
  "outcome_quality_of_life",
  "outcome_family_relationship_change",
] as const;

interface ScoreRow {
  key: string;
  label: string;
  criteria: string[] | null;
  score: number | null;
}

/**
 * The three "how did things change after detransitioning" scale questions,
 * returned as 5-level better/same/worse distributions.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          f.key,
          f.label,
          CASE
            WHEN jsonb_typeof(f.question->'criteria') = 'array'
              THEN f.question->'criteria'
          END AS criteria,
          a.score
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.kind = 'score'
          AND f.key IN (${sql.join(
            SCORE_KEYS.map((key) => sql`${key}`),
            sql`, `,
          )})
      `),
    ) as unknown as ScoreRow[];

    const panels = new Map<
      string,
      {
        key: string;
        label: string;
        criteria: string[];
        levels: number[];
        n: number;
      }
    >();

    for (const row of rows) {
      let panel = panels.get(row.key);
      if (!panel) {
        panel = {
          key: row.key,
          label: row.label,
          criteria: Array.isArray(row.criteria) ? row.criteria : [],
          levels: [0, 0, 0, 0, 0],
          n: 0,
        };
        panels.set(row.key, panel);
      }
      if (typeof row.score !== "number") continue;
      const level = Math.min(4, Math.max(0, Math.round(row.score)));
      panel.levels[level] += 1;
      panel.n += 1;
    }

    // Keep the requested order and drop panels with no answers.
    const orderedPanels = SCORE_KEYS.map((key) => panels.get(key)).filter(
      (panel): panel is NonNullable<typeof panel> => Boolean(panel),
    );

    return NextResponse.json(
      {
        cohort: orderedPanels.reduce((max, panel) => Math.max(max, panel.n), 0),
        panels: orderedPanels,
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching after-detransition data:", error);
    return NextResponse.json(
      { error: "Failed to fetch after-detransition data" },
      { status: 500 },
    );
  }
}
