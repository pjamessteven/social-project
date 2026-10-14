import { spread, transitionYears } from "@/app/lib/stats-math";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withFeatureCache } from "../cache";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  MEDICAL_TIER_KEYS,
  medicalTier,
  NOUL_THRESHOLD,
  parseFeatureFilters,
  type MedicalTier,
} from "../helpers";

/** Tiers shown, least to most invasive. "Did not transition" has no
 * duration and "unclear" says nothing about the step reached. */
const TIERS = [
  "social_only",
  "hormones",
  "surgery",
] as const satisfies readonly MedicalTier[];

interface Row {
  username: string;
  key: string | null;
  noul: number | null;
  threshold: number | null;
  transition_age: number | null;
  detransition_age: number | null;
  transition_year: number | null;
  detransition_year: number | null;
}

/**
 * Years in transition by the most invasive medical step a story reached
 * (same tiers as medical-gradient): median and interquartile range per tier.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          t.username,
          f.key,
          a.noul,
          COALESCE(f.threshold, ${NOUL_THRESHOLD})::real AS threshold,
          t.transition_age,
          t.detransition_age,
          t.transition_year,
          t.detransition_year
        FROM latest_timelines t
        JOIN cohort c ON c.username = t.username
        LEFT JOIN filtered_answers a ON a.username = t.username
        LEFT JOIN detrans_features f
          ON f.id = a.feature_id
          AND f.enabled = true
          AND f.key IN (${sql.join(
            MEDICAL_TIER_KEYS.map((key) => sql`${key}`),
            sql`, `,
          )})
      `),
    ) as unknown as Row[];

    const people = new Map<
      string,
      { years: number | null; answers: Map<string, boolean> }
    >();
    for (const row of rows) {
      let person = people.get(row.username);
      if (!person) {
        person = {
          years: transitionYears({
            transitionYear: row.transition_year,
            detransitionYear: row.detransition_year,
            transitionAge: row.transition_age,
            detransitionAge: row.detransition_age,
          }),
          answers: new Map(),
        };
        people.set(row.username, person);
      }
      if (row.key && row.threshold != null) {
        person.answers.set(
          row.key,
          typeof row.noul === "number" && row.noul >= row.threshold,
        );
      }
    }

    const byTier = new Map<MedicalTier, number[]>();
    for (const { years, answers } of people.values()) {
      if (years == null) continue;
      const tier = medicalTier((key) => answers.get(key) === true);
      const list = byTier.get(tier) ?? [];
      list.push(years);
      byTier.set(tier, list);
    }

    return NextResponse.json(
      {
        tiers: TIERS.map((key) => ({
          key,
          ...(spread(byTier.get(key) ?? []) ?? { n: 0 }),
        })),
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching duration by tier:", error);
    return NextResponse.json(
      { error: "Failed to fetch duration by tier" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
