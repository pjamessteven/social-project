import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cohortCte,
  FEATURE_CACHE_HEADERS,
  MEDICAL_TIER_KEYS,
  medicalTier,
  NOUL_THRESHOLD,
  parseFeatureFilters,
  type MedicalTier,
} from "../helpers";

const RELEVANT_KEYS = [
  ...MEDICAL_TIER_KEYS,
  "regret_transition",
  "no_regret",
] as const;

const TIER_ORDER = [
  "no_transition",
  "social_only",
  "hormones",
  "surgery",
  "unclear",
] as const satisfies readonly MedicalTier[];

type TierKey = MedicalTier;

interface AnswerRow {
  username: string;
  key: string;
  noul: number | null;
  threshold: number;
}

/**
 * Regret by medical involvement: each story is placed in the most invasive
 * tier it reached, then we show the regret/no-regret/not-stated composition
 * per tier. Descriptive only — people who stop early never reach later tiers.
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          a.username,
          f.key,
          a.noul,
          COALESCE(f.threshold, ${NOUL_THRESHOLD})::float AS threshold
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.key IN (${sql.join(
            RELEVANT_KEYS.map((key) => sql`${key}`),
            sql`, `,
          )})
      `),
    ) as unknown as AnswerRow[];

    const byUser = new Map<string, Map<string, boolean>>();
    for (const row of rows) {
      let userAnswers = byUser.get(row.username);
      if (!userAnswers) {
        userAnswers = new Map();
        byUser.set(row.username, userAnswers);
      }
      userAnswers.set(
        row.key,
        typeof row.noul === "number" && row.noul >= row.threshold,
      );
    }

    const tiers = new Map<
      TierKey,
      { n: number; regrets: number; noRegret: number; notStated: number }
    >(
      TIER_ORDER.map((key) => [
        key,
        { n: 0, regrets: 0, noRegret: 0, notStated: 0 },
      ]),
    );

    for (const answers of byUser.values()) {
      const truth = (key: string) => answers.get(key) === true;
      const tier = medicalTier(truth);
      const bucket = tiers.get(tier)!;
      bucket.n += 1;
      if (truth("regret_transition")) bucket.regrets += 1;
      else if (truth("no_regret")) bucket.noRegret += 1;
      else bucket.notStated += 1;
    }

    return NextResponse.json(
      {
        cohort: byUser.size,
        tiers: TIER_ORDER.map((key) => ({ key, ...tiers.get(key)! })),
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching medical gradient:", error);
    return NextResponse.json(
      { error: "Failed to fetch medical gradient" },
      { status: 500 },
    );
  }
}
