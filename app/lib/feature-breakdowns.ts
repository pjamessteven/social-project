/**
 * Configuration for the config-driven "breakdown" sections (Regret,
 * Complications, Mental health, Current status, Social cost of detransitioning).
 *
 * Each view names the features that feed the generic section: an optional
 * numeric scale, an optional choice distribution (plus a secondary one), a
 * ranked list of yes/no statements, and how the composition line is derived.
 *
 * Feature keys must exist in the taxonomy (app/lib/feature-taxonomy.ts); keys
 * missing from the DB are skipped gracefully by the API.
 */

export type BreakdownComposition =
  | { mode: "pair"; positiveKey: string; negativeKey: string }
  | { mode: "any" }
  | { mode: "none" };

export interface BreakdownConfig {
  id: string;
  scoreKey?: string;
  choiceKey?: string;
  secondaryChoiceKey?: string;
  /** Choice options left out of the distribution (shares use the rest). */
  choiceExclude?: string[];
  statementKeys: string[];
  /** Show each statement's exact extraction question under its label. */
  showQuestions?: boolean;
  /** Keep statements in config order instead of ranking by prevalence. */
  keepOrder?: boolean;
  composition: BreakdownComposition;
  /** Colour direction for the scale: severity ramps up red, support is diverging. */
  scaleTone?: "severity" | "support";
}

export const FEATURE_BREAKDOWNS: BreakdownConfig[] = [
  {
    id: "regret",
    scoreKey: "regret_intensity",
    choiceKey: "regret_trajectory",
    statementKeys: [
      "regret_hormones",
      "regret_top_surgery",
      "regret_bottom_surgery",
      "regret_voice",
      "regret_fertility",
      "regret_lost_time",
      "regret_social_loss",
    ],
    composition: {
      mode: "pair",
      positiveKey: "regret_transition",
      negativeKey: "no_regret",
    },
  },
  {
    id: "complications",
    scoreKey: "complication_severity",
    statementKeys: [
      "medical_complications",
      "irreversible_changes",
      "now_infertile",
      "fertility_preservation_desire",
      "ongoing_medical_needs",
      "healthcare_dissatisfaction",
    ],
    composition: { mode: "any" },
  },
  {
    id: "mental_health",
    scoreKey: "mh_severity",
    statementKeys: [
      "mh_depression",
      "mh_anxiety",
      "mh_bpd",
      "mh_autism",
      "mh_adhd",
      "mh_suicidal_ideation",
      "mh_suicidality_during_transition",
      "mh_suicidality_since_detransition",
      "mh_self_harm",
      "mh_dissociation",
      "mh_eating_disorder",
      "mh_psychosis",
      "mh_ocd",
      "mh_bipolar",
      "mh_low_self_esteem",
      "mh_social_anxiety_isolation",
      "mh_generic",
    ],
    composition: { mode: "any" },
  },
  {
    id: "current_status",
    choiceKey: "attitude_towards_transition_for_others",
    statementKeys: [],
    composition: { mode: "none" },
  },
  {
    // Only questions that are explicitly about detransitioning. Family support
    // / rejection, relationships and career impact were asked about
    // "transition/detransition" together, so they can't be attributed to
    // either; family relationships since detransitioning live in the "after"
    // section (outcome_family_relationship_change).
    id: "family_community",
    showQuestions: true,
    statementKeys: [
      "social_isolation",
      "social_ostracism",
      "community_disillusionment",
    ],
    composition: { mode: "any" },
  },
  {
    id: "drivers",
    statementKeys: [
      "body_dysmorphia",
      "identity_instability",
      "fear_of_sexualization",
      "contributed_social_pressure_to_transition",
      "autogynephilia",
      "autoandrophilia",
      "contributed_fetish_acceptance",
      "contributed_psychedelics",
    ],
    composition: { mode: "none" },
  },
  {
    id: "adversity",
    statementKeys: [
      "adv_trauma_history",
      "adv_childhood_abuse",
      "adv_family_dysfunction",
      "adv_bullying",
      "adv_sexual_assault",
    ],
    composition: { mode: "any" },
  },
  {
    id: "online",
    choiceKey: "platform_primary",
    choiceExclude: ["none"],
    statementKeys: [
      "contributed_online_influence",
      "contributed_peer_influence",
      "peer_pressure",
      "ideological_involvement",
      "online_community_disillusionment",
    ],
    composition: { mode: "none" },
  },
  {
    id: "process",
    statementKeys: [
      "process_self_reflection",
      "process_research_consumption",
      "process_detrans_community_exposure",
      "process_benefited_from_therapy",
      "process_negative_therapy_experience",
      "process_time_off_hormones",
      "process_medical_scare",
      "process_family_partner_intervention",
      "process_life_stage_change",
      "process_spiritual_experience",
    ],
    composition: { mode: "any" },
  },
  {
    id: "medical_steps",
    statementKeys: [
      "took_hormones",
      "top_surgery",
      "took_puberty_blockers",
      "diy_hormones",
      "bottom_surgery",
      "facial_surgery",
      "only_social_transition",
    ],
    composition: { mode: "none" },
  },
  {
    id: "suicidality",
    statementKeys: [
      "mh_suicidal_ideation",
      "mh_suicidality_during_transition",
      "mh_suicidality_since_detransition",
      "mh_self_harm",
    ],
    composition: { mode: "none" },
    keepOrder: true,
  },
];

export function breakdownById(id: string): BreakdownConfig | undefined {
  return FEATURE_BREAKDOWNS.find((view) => view.id === id);
}
