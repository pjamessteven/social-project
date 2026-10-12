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
 * Cause -> process -> outcome flow for the filtered cohort.
 *
 * Each story contributes exactly one bucket per stage so the Sankey flows are
 * consistent:
 *   cause   primary_transition_reason winning option (Jev choice)
 *   process first matching turning point from a priority list
 *   outcome regret_transition / no_regret / not stated
 *
 * Buckets are returned as stable keys; the client translates them.
 */

const CAUSE_FEATURE = "primary_transition_reason";

const PROCESS_PRIORITY = [
  "process_benefited_from_therapy",
  "process_detrans_community_exposure",
  "process_research_consumption",
  "process_self_reflection",
  "process_time_off_hormones",
  "process_medical_scare",
  "process_family_partner_intervention",
  "process_spiritual_experience",
] as const;

const OUTCOME_FEATURES = ["regret_transition", "no_regret"] as const;

const RELEVANT_KEYS = [CAUSE_FEATURE, ...PROCESS_PRIORITY, ...OUTCOME_FEATURES];

interface AnswerRow {
  username: string;
  key: string;
  noul: number | null;
  choice: string | null;
  probabilities: Record<string, number> | null;
  threshold: number;
}

async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          a.username,
          f.key,
          a.noul,
          a.choice,
          a.probabilities,
          COALESCE(f.threshold, ${NOUL_THRESHOLD})::real AS threshold
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        WHERE f.enabled = true
          AND f.key IN (${sql.join(
            RELEVANT_KEYS.map((key) => sql`${key}`),
            sql`, `,
          )})
      `),
    ) as unknown as AnswerRow[];

    // `answers` already resolves the newest answer per (user, feature), so a
    // user's flows simply follow whatever their latest answers say.
    const byUser = new Map<string, Map<string, AnswerRow>>();
    for (const row of rows) {
      let userAnswers = byUser.get(row.username);
      if (!userAnswers) {
        userAnswers = new Map();
        byUser.set(row.username, userAnswers);
      }
      userAnswers.set(row.key, row);
    }

    const causeCounts = new Map<string, number>();
    const processCounts = new Map<string, number>();
    const outcomeCounts = new Map<string, number>();
    const causeProcess = new Map<string, number>();
    const processOutcome = new Map<string, number>();

    const bump = (map: Map<string, number>, key: string) =>
      map.set(key, (map.get(key) ?? 0) + 1);

    for (const userAnswers of byUser.values()) {
      // Cause: argmax of the Jev choice probabilities, falling back to the
      // hard choice when no probability payload exists.
      const causeAnswer = userAnswers.get(CAUSE_FEATURE);
      let cause = "unclear";
      if (causeAnswer) {
        const probabilities = causeAnswer.probabilities;
        if (probabilities && typeof probabilities === "object") {
          let bestKey: string | null = null;
          let bestValue = -1;
          for (const [option, value] of Object.entries(probabilities)) {
            if (typeof value === "number" && value > bestValue) {
              bestValue = value;
              bestKey = option;
            }
          }
          if (bestKey) cause = bestKey;
        } else if (causeAnswer.choice) {
          cause = causeAnswer.choice;
        }
      }

      // Process: first turning point above its threshold.
      let process = "other";
      for (const key of PROCESS_PRIORITY) {
        const answer = userAnswers.get(key);
        if (
          answer &&
          typeof answer.noul === "number" &&
          answer.noul >= answer.threshold
        ) {
          process = key;
          break;
        }
      }

      // Outcome: regret takes priority over no-regret statements.
      const regret = userAnswers.get(OUTCOME_FEATURES[0]);
      const noRegret = userAnswers.get(OUTCOME_FEATURES[1]);
      let outcome = "not_stated";
      if (
        regret &&
        typeof regret.noul === "number" &&
        regret.noul >= regret.threshold
      ) {
        outcome = "regrets";
      } else if (
        noRegret &&
        typeof noRegret.noul === "number" &&
        noRegret.noul >= noRegret.threshold
      ) {
        outcome = "no_regret";
      }

      bump(causeCounts, cause);
      bump(processCounts, process);
      bump(outcomeCounts, outcome);
      bump(causeProcess, `${cause}|${process}`);
      bump(processOutcome, `${process}|${outcome}`);
    }

    const toStage = (counts: Map<string, number>) =>
      [...counts.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);

    const toLinks = (counts: Map<string, number>, leftName: string) =>
      [...counts.entries()].map(([compound, count]) => {
        const [left, right] = compound.split("|");
        return { [leftName]: left, right, count };
      });

    // Percentages in the UI are against stories that contributed to the flow,
    // not the whole cohort.
    const journeyCohort = byUser.size;

    return NextResponse.json(
      {
        cohort: journeyCohort,
        stages: {
          cause: toStage(causeCounts),
          process: toStage(processCounts),
          outcome: toStage(outcomeCounts),
        },
        links: {
          causeProcess: toLinks(causeProcess, "cause"),
          processOutcome: toLinks(processOutcome, "process"),
        },
      },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching feature pathways:", error);
    return NextResponse.json(
      { error: "Failed to fetch pathways" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
