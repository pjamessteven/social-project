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

/**
 * A story's answer to one side of a comparison: true, false, or unknown
 * (not stated / not answered), in which case the story is left out.
 */
type Probe = (story: Story) => boolean | null;

interface Story {
  sex: "f" | "m" | null;
  transitionAge: number | null;
  noul: Map<string, boolean>;
  choice: Map<string, string>;
  score: Map<string, number>;
}

const yes =
  (key: string): Probe =>
  (story) =>
    story.noul.get(key) ?? null;

const scoreAtLeast =
  (key: string, min: number): Probe =>
  (story) => {
    const value = story.score.get(key);
    // Round to the nearest scale level, as the after-detransition chart does.
    return value == null ? null : Math.round(value) >= min;
  };

const choiceIn =
  (key: string, options: string[], unknown: string[]): Probe =>
  (story) => {
    const value = story.choice.get(key);
    if (!value || unknown.includes(value)) return null;
    return options.includes(value);
  };

const PREDICTORS: Record<string, Probe> = {
  under18: (story) =>
    story.transitionAge == null ? null : story.transitionAge < 18,
  women: (story) => (story.sex == null ? null : story.sex === "f"),
  sameSex: choiceIn("sexuality_before", ["homosexual"], ["unclear"]),
  took_puberty_blockers: yes("took_puberty_blockers"),
  took_hormones: yes("took_hormones"),
  top_surgery: yes("top_surgery"),
  process_benefited_from_therapy: yes("process_benefited_from_therapy"),
  gender_nonconformity_childhood: yes("gender_nonconformity_childhood"),
  process_spiritual_experience: yes("process_spiritual_experience"),
  autogynephilia: yes("autogynephilia"),
  adv_trauma_history: yes("adv_trauma_history"),
  contributed_online_influence: yes("contributed_online_influence"),
};

const OUTCOMES: Record<string, Probe> = {
  regret: yes("regret_transition"),
  bodyReconciliation: yes("outcome_body_reconciliation"),
  retransitioned: yes("retransitioned"),
  // Scores run 0-4 (much worse ... much better); 3+ is "better".
  mentalHealthBetter: scoreAtLeast("mh_change_after_detransition", 3),
  critical: choiceIn(
    "attitude_towards_transition_for_others",
    ["critical", "opposed"],
    ["not_addressed"],
  ),
};

/**
 * Curated questions people actually argue about, in display order. The
 * answer is computed live for the current filters, so a question can come
 * out as "no clear difference" — which is itself a finding.
 */
const QUESTIONS: {
  id: string;
  theme: string;
  predictor: string;
  outcome: string;
}[] = [
  {
    id: "under18_regret",
    theme: "medical",
    predictor: "under18",
    outcome: "regret",
  },
  {
    id: "blockers_retransition",
    theme: "medical",
    predictor: "took_puberty_blockers",
    outcome: "retransitioned",
  },
  {
    id: "blockers_mental",
    theme: "medical",
    predictor: "took_puberty_blockers",
    outcome: "mentalHealthBetter",
  },
  {
    id: "hormones_body",
    theme: "medical",
    predictor: "took_hormones",
    outcome: "bodyReconciliation",
  },
  {
    id: "therapy_mental",
    theme: "helped",
    predictor: "process_benefited_from_therapy",
    outcome: "mentalHealthBetter",
  },
  {
    id: "therapy_body",
    theme: "helped",
    predictor: "process_benefited_from_therapy",
    outcome: "bodyReconciliation",
  },
  {
    id: "gnc_body",
    theme: "helped",
    predictor: "gender_nonconformity_childhood",
    outcome: "bodyReconciliation",
  },
  {
    id: "samesex_regret",
    theme: "who",
    predictor: "sameSex",
    outcome: "regret",
  },
  {
    id: "trauma_regret",
    theme: "who",
    predictor: "adv_trauma_history",
    outcome: "regret",
  },
  {
    id: "online_regret",
    theme: "who",
    predictor: "contributed_online_influence",
    outcome: "regret",
  },
  {
    id: "surgery_critical",
    theme: "views",
    predictor: "top_surgery",
    outcome: "critical",
  },
  {
    id: "women_critical",
    theme: "views",
    predictor: "women",
    outcome: "critical",
  },
  {
    id: "spiritual_critical",
    theme: "views",
    predictor: "process_spiritual_experience",
    outcome: "critical",
  },
  {
    id: "agp_critical",
    theme: "views",
    predictor: "autogynephilia",
    outcome: "critical",
  },
];

const NOUL_KEYS = [
  "regret_transition",
  "outcome_body_reconciliation",
  "retransitioned",
  "took_puberty_blockers",
  "took_hormones",
  "top_surgery",
  "process_benefited_from_therapy",
  "gender_nonconformity_childhood",
  "process_spiritual_experience",
  "autogynephilia",
  "adv_trauma_history",
  "contributed_online_influence",
];
const OTHER_KEYS = [
  "sexuality_before",
  "attitude_towards_transition_for_others",
  "mh_change_after_detransition",
];
const MIN_GROUP_N = 30;

/**
 * Connections: answers to a fixed set of contested questions ("does
 * starting before 18 change regret?"), each as the outcome's share in
 * stories with vs without the predictor, with a risk ratio and 95%
 * interval. Respects the stats filters.
 */
async function getFeature(request: NextRequest) {
  try {
    const filters = parseFeatureFilters(request);
    const keyList = sql.join(
      [...NOUL_KEYS, ...OTHER_KEYS].map((key) => sql`${key}`),
      sql`, `,
    );

    const rows = Array.from(
      await db.execute(sql`
        WITH ${cohortCte(filters)}
        SELECT
          a.username,
          f.key,
          f.kind,
          (a.noul >= COALESCE(f.threshold, ${NOUL_THRESHOLD})) AS v,
          a.choice,
          a.score,
          fu.sex,
          t.transition_age
        FROM filtered_answers a
        JOIN detrans_features f ON f.id = a.feature_id
        LEFT JOIN filtered_users fu ON fu.username = a.username
        LEFT JOIN latest_timelines t ON t.username = a.username
        WHERE f.enabled = true AND f.key IN (${keyList})
      `),
    ) as unknown as {
      username: string;
      key: string;
      kind: string;
      v: boolean | null;
      choice: string | null;
      score: number | null;
      sex: string | null;
      transition_age: number | null;
    }[];

    const stories = new Map<string, Story>();
    for (const row of rows) {
      let story = stories.get(row.username);
      if (!story) {
        story = {
          sex: row.sex === "f" || row.sex === "m" ? row.sex : null,
          transitionAge:
            typeof row.transition_age === "number" ? row.transition_age : null,
          noul: new Map(),
          choice: new Map(),
          score: new Map(),
        };
        stories.set(row.username, story);
      }
      if (row.kind === "noul" && row.v != null) story.noul.set(row.key, row.v);
      if (row.kind === "choice" && row.choice)
        story.choice.set(row.key, row.choice);
      if (row.kind === "score" && typeof row.score === "number") {
        story.score.set(row.key, row.score);
      }
    }

    const all = [...stories.values()];
    const findings = QUESTIONS.map((question) => {
      const predictor = PREDICTORS[question.predictor];
      const outcome = OUTCOMES[question.outcome];
      let nWith = 0;
      let withYes = 0;
      let nWithout = 0;
      let withoutYes = 0;
      for (const story of all) {
        const p = predictor(story);
        const o = outcome(story);
        if (p == null || o == null) continue;
        if (p) {
          nWith += 1;
          if (o) withYes += 1;
        } else {
          nWithout += 1;
          if (o) withoutYes += 1;
        }
      }
      if (nWith < MIN_GROUP_N || nWithout < MIN_GROUP_N) return null;
      const ratio = riskRatio(withYes, nWith, withoutYes, nWithout);
      return {
        ...question,
        nWith,
        withYes,
        nWithout,
        withoutYes,
        ratio: ratio?.ratio ?? null,
        low: ratio?.low ?? null,
        high: ratio?.high ?? null,
      };
    }).filter(
      (finding): finding is NonNullable<typeof finding> => finding != null,
    );

    return NextResponse.json(
      { cohort: stories.size, findings },
      { headers: FEATURE_CACHE_HEADERS },
    );
  } catch (error) {
    console.error("Error fetching connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 },
    );
  }
}

export const GET = withFeatureCache(getFeature);
