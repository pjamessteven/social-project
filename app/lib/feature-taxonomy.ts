/**
 * Canonical feature taxonomy for reprocessing r/detrans user profiles.
 *
 * Single source of truth for:
 *   * scripts/seed-features.ts        -> detrans_features rows
 *   * scripts/extract-user-features.ts -> Jev System One questions
 *   * (later) scripts/sync-features-to-tags.ts -> detrans_tags / detrans_user_tags
 *
 * Tiers:
 *   cause   - why they transitioned / detransitioned
 *   process - what moved them from transition to detransition (therapy, exposure, ...)
 *   outcome - what changed afterwards (regret, quality of life, ...)
 *
 * Rules:
 *   * Noul instructions are yes/no statements about the user's own account.
 *   * Choice options must be mutually exclusive; use `other_*` for the fallback.
 *   * `tag` is the canonical detrans_tags.name written when the answer crosses
 *     `threshold` (default 0.8 for nouls). Question wording changes are safe;
 *     tag names are identifiers and must stay stable.
 *   * Reason choices also map winning option -> reason tag via `choiceTagMap`;
 *     those tags carry tagType "transition reason" / "detransition reason" so
 *     the stats pie charts keep working.
 */

export type FeatureKind = "noul" | "choice" | "score";
export type FeatureTier = "cause" | "process" | "outcome";

export interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  criteria: string[];
}

export type JevQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface FeatureDef {
  /** Stable identifier, also the Jev question id. */
  key: string;
  /** Human-readable label (UI / reports). */
  label: string;
  /** Grouping bucket, e.g. "regret", "medical". */
  group: string;
  tier: FeatureTier;
  question: JevQuestion;
  /** Canonical tag name written when a noul crosses threshold. */
  tag?: string;
  /** Tag type in detrans_tag_types; defaults to "feature". */
  tagType?: string;
  /** Noul probability (default 0.8) / minimum choice probability. */
  threshold?: number;
  /** choice: map of option key -> reason tag name. */
  choiceTagMap?: Record<string, string>;
  /** choice: probability the winning option must reach to assign a tag. */
  choiceTagThreshold?: number;
}

export const DEFAULT_NOUL_THRESHOLD = 0.8;
export const DEFAULT_CHOICE_THRESHOLD = 0.4;
export const TAXONOMY_VERSION = 4;

const noul = (
  instructions: string,
  criteria?: { true?: string; false?: string },
): NoulQuestion => ({
  type: "noul",
  instructions,
  ...(criteria && { criteria }),
});

const choice = (
  instructions: string,
  criteria: Record<string, string | null>,
): ChoiceQuestion => ({ type: "choice", instructions, criteria });

const score = (instructions: string, criteria: string[]): ScoreQuestion => ({
  type: "score",
  instructions,
  criteria,
});

// ---------------------------------------------------------------------------
// Primary reasons (choice questions feeding the stats pie charts)
// ---------------------------------------------------------------------------

const TRANSITION_REASON_OPTIONS: Record<string, string> = {
  social_role_discomfort:
    "Discomfort with the expectations/social role of their sex; gender nonconformity.",
  internalised_homophobia:
    "Discomfort with same-sex attraction (internalised homophobia).",
  internalised_misogyny_misandry:
    "Discomfort with their own sex (internalised misogyny or misandry), including felt oppression based on sex.",
  trauma:
    "Trauma or abuse (childhood or later) driving the wish to escape the body/self.",
  mental_health_issues:
    "Mental health conditions (depression, anxiety, BPD, OCD, psychosis, etc.) as the primary driver.",
  neurodivergence:
    "Autism / ADHD / sensory processing differences as the primary driver.",
  body_dysmorphia: "Body dysmorphia or severe body image disturbance.",
  online_influence:
    "Online communities, social media, or algorithms (Reddit, Tumblr, TikTok, etc.).",
  peer_influence: "Friends, peer group, or partner influence.",
  sexual_factors:
    "Sexual arousal patterns or fetishes (autogynephilia, autoandrophilia, cross-dressing).",
  parental_or_medical_pressure:
    "Parental, therapeutic, or medical pressure/affirmation without exploration.",
  other_unclear:
    "No single dominant reason, unclear, or none of the above fits.",
};

const DETRANSITION_REASON_OPTIONS: Record<string, string> = {
  accepted_sexed_body:
    "Came to accept their biological sex/body rather than needing to change it.",
  social_construct_realisation:
    "Came to see gender roles and the social construction of gender as the real problem.",
  trauma_realisation:
    "Realised underlying trauma or abuse caused the dysphoria and the transition wish.",
  mental_health_realisation:
    "Realised an underlying mental health condition (depression, anxiety, BPD, OCD, psychosis) was driving it.",
  neurodivergence_realisation:
    "Realised autism/ADHD/sensory issues were driving it.",
  fantasy_reality_disillusionment:
    "The reality of transition did not match the fantasy/expectation; exhaustion with performing a role.",
  surgery_regret_medical_complications:
    "Regret after surgery or significant medical complications/side effects.",
  ideological_disillusionment:
    "Disillusionment with the transition movement, its ideology, its community, or the medical system.",
  social_pressure_ostracism:
    "External social pressure, rejection, harassment, or loss of relationships/community.",
  failure_to_pass:
    "Could not pass or be accepted as the target sex, even after transition.",
  internalised_homophobia_realisation:
    "Realised internalised homophobia had motivated the transition.",
  internalised_misogyny_misandry_realisation:
    "Realised internalised misogyny/misandry had motivated the transition.",
  sexual_factors_realisation:
    "Realised sexual factors (AGP/AAP/fetish) had motivated the transition.",
  religious_or_spiritual_change:
    "Religious conversion, faith crisis, or spiritual experience.",
  fertility_or_family_desires:
    "Fertility concerns, preservation, or desire for a family/maternal role.",
  other_unclear:
    "No single dominant reason, unclear, or none of the above fits.",
};

// ---------------------------------------------------------------------------
// Feature list
// ---------------------------------------------------------------------------

export const featureTaxonomy: FeatureDef[] = [
  // ── Causes: primary reasons ────────────────────────────────────────────────
  {
    key: "primary_transition_reason",
    label: "Primary transition reason",
    group: "reasons",
    tier: "cause",
    question: choice(
      "What is the single most significant reason this person initially transitioned?",
      TRANSITION_REASON_OPTIONS,
    ),
    tagType: "transition reason",
    choiceTagMap: {
      social_role_discomfort: "social role discomfort",
      internalised_homophobia: "internalised homophobia",
      internalised_misogyny_misandry: "internalised misogyny / misandry",
      trauma: "trauma",
      mental_health_issues: "mental health issues",
      neurodivergence: "autism/neurodivergence",
      body_dysmorphia: "body dysmorphia",
      online_influence: "influenced online",
      peer_influence: "influenced by friends",
      sexual_factors: "sexual factors (AGP/AAP)",
      parental_or_medical_pressure: "parental or medical pressure",
      other_unclear: "other / unclear (transition)",
    },
  },
  {
    key: "primary_detransition_reason",
    label: "Primary detransition reason",
    group: "reasons",
    tier: "cause",
    question: choice(
      "What is the single most significant reason this person detransitioned?",
      DETRANSITION_REASON_OPTIONS,
    ),
    tagType: "detransition reason",
    choiceTagMap: {
      accepted_sexed_body: "accepted sexed body",
      social_construct_realisation: "social construct realisation",
      trauma_realisation: "trauma realisation",
      mental_health_realisation: "mental health realisation",
      neurodivergence_realisation: "neurodivergence realisation",
      fantasy_reality_disillusionment: "fantasy-reality disillusionment",
      surgery_regret_medical_complications:
        "surgery regret / medical complications",
      ideological_disillusionment: "ideological disillusionment",
      social_pressure_ostracism: "social pressure / ostracism",
      failure_to_pass: "failure to pass",
      internalised_homophobia_realisation:
        "internalised homophobia realisation",
      internalised_misogyny_misandry_realisation:
        "internalised misogyny / misandry realisation",
      sexual_factors_realisation: "sexual factors realisation (AGP/AAP)",
      religious_or_spiritual_change: "religious or spiritual change",
      fertility_or_family_desires: "fertility or family desires",
      other_unclear: "other / unclear (detransition)",
    },
  },

  // ── Causes: secondary contributors ─────────────────────────────────────────
  {
    key: "contributed_online_influence",
    label: "Online influence contributed",
    group: "causes",
    tier: "cause",
    question: noul(
      "Did online communities, social media, or algorithms play a significant role in this person's decision to transition?",
      {
        true: "Online spaces/algorithms were a significant factor",
        false: "No significant online role described",
      },
    ),
    tag: "influenced online",
  },
  {
    key: "contributed_peer_influence",
    label: "Peer influence contributed",
    group: "causes",
    tier: "cause",
    question: noul(
      "Did friends, a peer group, or a partner play a significant role in this person's decision to transition?",
      {
        true: "Friends/peers/partner were a significant factor",
        false: "No significant peer role described",
      },
    ),
    tag: "influenced by friends",
  },
  {
    key: "contributed_porn",
    label: "Porn contributed",
    group: "causes",
    tier: "cause",
    question: noul(
      "Did pornography use or porn-influenced expectations play a significant role in this person's transition?",
    ),
    tag: "porn influence",
  },
  {
    key: "contributed_anime_fandom",
    label: "Anime/fandom contributed",
    group: "causes",
    tier: "cause",
    question: noul(
      "Did anime, fanfiction, or online fandom play a significant role in this person's transition?",
    ),
    tag: "anime influence",
  },
  {
    key: "contributed_coercion",
    label: "Parental/medical pressure contributed",
    group: "causes",
    tier: "cause",
    question: noul(
      "Did parental, therapeutic, or medical pressure (including affirmation without exploration) play a significant role in this person's transition?",
    ),
    tag: "parental or medical coercion",
  },
  {
    key: "contributed_rapid_onset",
    label: "Rapid onset",
    group: "causes",
    tier: "cause",
    question: noul(
      "Did the person's gender dysphoria/trans identification emerge rapidly (within months) rather than gradually over years?",
    ),
    tag: "rapid onset gender dysphoria (ROGD)",
  },
  {
    key: "contributed_escapism",
    label: "Escapism",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe transition as an escape from other problems in life rather than a genuine identity?",
    ),
    tag: "escapism",
  },
  {
    key: "contributed_psychedelics",
    label: "Psychedelic/drug experience contributed",
    group: "causes",
    tier: "cause",
    question: noul(
      "Did psychedelic or other drug experiences play a significant role in the person's transition or detransition?",
    ),
    tag: "psychedelic drugs",
  },
  {
    key: "contributed_fetish_acceptance",
    label: "Fetish acceptance",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe engaging with a fetish or sexual interest as a reason for transition?",
    ),
    tag: "fetish acceptance",
  },
  {
    key: "autogynephilia",
    label: "Autogynephilia",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe autogynephilia (sexual arousal at the thought of being a woman) as relevant to their transition?",
    ),
    tag: "autogynephilia",
  },
  {
    key: "autoandrophilia",
    label: "Autoandrophilia",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe autoandrophilia (sexual arousal at the thought of being a man) as relevant to their transition?",
    ),
    tag: "autoandrophilia",
  },
  {
    key: "fear_of_sexualization",
    label: "Fear of sexualisation",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe wanting to escape sexualisation, objectification, or harassment directed at their birth sex?",
    ),
    tag: "fear of sexualization",
  },
  {
    key: "identity_instability",
    label: "Identity instability",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe longstanding identity instability or repeatedly adopting new identities?",
    ),
    tag: "identity instability",
  },
  {
    key: "gender_nonconformity_childhood",
    label: "Childhood gender nonconformity",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe significant childhood gender nonconformity (interests, presentation, play)?",
    ),
    tag: "gender nonconforming child",
  },
  {
    key: "contributed_social_pressure_to_transition",
    label: "Social pressure to transition",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe external pressure or encouragement to transition (online, peers, professionals, family)?",
    ),
  },
  {
    key: "puberty_discomfort",
    label: "Puberty discomfort",
    group: "causes",
    tier: "cause",
    question: noul(
      "Does the account describe distress tied specifically to puberty and body development?",
    ),
    tag: "puberty discomfort",
  },

  // ── Processes ──────────────────────────────────────────────────────────────
  {
    key: "process_benefited_from_therapy",
    label: "Benefited from therapy",
    group: "processes",
    tier: "process",
    question: noul(
      "Does the account describe therapy or counselling that genuinely helped them understand themselves or their underlying issues (not merely affirming)?",
      {
        true: "Exploratory/challenging therapy meaningfully helped",
        false: "No such therapy described",
      },
    ),
    tag: "benefited from non-affirming therapy",
  },
  {
    key: "process_negative_therapy_experience",
    label: "Negative therapy experience",
    group: "processes",
    tier: "process",
    question: noul(
      "Does the account describe therapy or a therapist that pushed affirmation or failed to explore underlying issues, making things worse?",
      {
        true: "Affirm-only or rushed therapy made things worse",
        false: "No such experience described",
      },
    ),
    tag: "affirming-only therapy",
  },
  {
    key: "process_detrans_community_exposure",
    label: "Detrans community exposure",
    group: "processes",
    tier: "process",
    question: noul(
      "Did exposure to detransition communities, stories, or role models (online or in person) play a significant role in their realisation?",
      {
        true: "Detrans exposure was a significant contributor",
        false: "Not significant or not described",
      },
    ),
    tag: "exposure to detrans community",
  },
  {
    key: "process_research_consumption",
    label: "Consumed detransition research/media",
    group: "processes",
    tier: "process",
    question: noul(
      "Did reading research, watching videos, or consuming other media about detransition play a significant role in their realisation?",
      {
        true: "Research/media consumption was a significant contributor",
        false: "Not significant or not described",
      },
    ),
    tag: "consumed detrans research",
  },
  {
    key: "process_self_reflection",
    label: "Self-reflection",
    group: "processes",
    tier: "process",
    question: noul(
      "Does the account describe deliberate self-reflection, journaling, or introspection as central to their realisation?",
      {
        true: "Deliberate self-reflection central to the realisation",
        false: "Not described as central",
      },
    ),
    tag: "self-reflection",
  },
  {
    key: "process_spiritual_experience",
    label: "Spiritual experience",
    group: "processes",
    tier: "process",
    question: noul(
      "Does the account describe a spiritual or religious experience or conversion as significant to their detransition?",
    ),
    tag: "spiritual experience",
  },
  {
    key: "process_time_off_hormones",
    label: "Time off hormones",
    group: "processes",
    tier: "process",
    question: noul(
      "Did a period off puberty blockers/hormones (voluntary or involuntary) trigger a re-evaluation leading toward detransition?",
    ),
    tag: "time off hormones",
  },
  {
    key: "process_medical_scare",
    label: "Medical scare",
    group: "processes",
    tier: "process",
    question: noul(
      "Did a specific medical incident, complication, or health scare prompt their re-evaluation?",
    ),
    tag: "medical scare",
  },
  {
    key: "process_family_partner_intervention",
    label: "Family/partner intervention",
    group: "processes",
    tier: "process",
    question: noul(
      "Did a family member or partner intervene, confront them, or change their situation in a way that prompted re-evaluation?",
    ),
    tag: "family or partner intervention",
  },
  {
    key: "process_life_stage_change",
    label: "Life stage change",
    group: "processes",
    tier: "process",
    question: noul(
      "Did a life stage change (leaving home, starting work/study, pregnancy, aging) prompt their re-evaluation?",
    ),
    tag: "life stage change",
  },

  // ── Identity / current status ──────────────────────────────────────────────
  {
    key: "current_status",
    label: "Current identity status",
    group: "identity",
    tier: "outcome",
    question: choice(
      "Which best describes this person's current identity/status?",
      {
        detransitioned:
          "Stopped transitioning after at least one medical intervention (puberty blockers, cross-sex hormones, or surgery) and no longer identifies as trans. If the account shows no medical intervention, use desisted instead.",
        desisted:
          "Stopped or rejected the trans identity with NO medical intervention — social transition only, or never transitioned. If the account shows any medical step (even briefly taking hormones or blockers), use detransitioned instead.",
        retransitioned:
          "Detransitioned and then transitioned again (or plans to).",
        still_trans_questioning:
          "Still identifies as trans but questioning or partially detransitioning.",
        questioning: "Questioning; no clear current identity stated.",
        unclear: "Not enough information to tell.",
      },
    ),
  },
  {
    key: "currently_on_hormones",
    label: "Currently on hormones",
    group: "identity",
    tier: "outcome",
    question: noul(
      "Is the person currently taking cross-sex hormones (at the time of their recent posts)?",
    ),
    tag: "currently on hormones",
  },
  {
    key: "still_identifies_trans",
    label: "Still identifies as trans",
    group: "identity",
    tier: "outcome",
    question: noul(
      "Does the person still identify as transgender (even if detransitioning or off hormones)?",
      {
        true: "Still self-identifies as trans",
        false: "No longer identifies as trans, or unclear",
      },
    ),
    tag: "still identifies as trans",
  },
  {
    key: "nonbinary_after_detransition",
    label: "Non-binary identity after detransition",
    group: "identity",
    tier: "outcome",
    question: noul(
      "After detransitioning, does this person identify as non-binary (or a similar non-binary identity such as genderqueer, agender, or genderfluid)?",
      {
        true: "Identifies with a non-binary/genderqueer identity after detransitioning",
        false:
          "Does not identify as non-binary after detransition, or never detransitioned/unclear",
      },
    ),
    tag: "non-binary after detransition",
  },
  {
    key: "retransitioned",
    label: "Re-transitioned",
    group: "identity",
    tier: "outcome",
    question: noul(
      "Has the person re-transitioned, or stated an intention to re-transition, after detransitioning?",
    ),
    tag: "retransition",
  },
  {
    key: "never_transitioned",
    label: "Never transitioned",
    group: "identity",
    tier: "outcome",
    question: noul(
      "Did the person never actually commence medical or social transition?",
      {
        true: "No medical or social transition ever commenced",
        false: "Transition commenced, even if later stopped",
      },
    ),
    tag: "never transitioned",
  },
  {
    key: "no_detransition_occurred",
    label: "No detransition occurred",
    group: "identity",
    tier: "outcome",
    question: noul(
      "Is it clear that the person has NOT actually detransitioned (e.g. they are considering it, a supporter, or the story is about someone else)?",
      {
        true: "Clear they have not detransitioned (considering / supporter / someone else's story)",
        false: "They have detransitioned or are actively detransitioning",
      },
    ),
    tag: "no detransition occurred",
  },
  {
    key: "only_social_transition",
    label: "Only social transition",
    group: "identity",
    tier: "outcome",
    question: noul(
      "Did the person only ever transition socially (name/pronouns/presentation), without medical intervention?",
    ),
    tag: "only transitioned socially",
  },

  // ── Regret ─────────────────────────────────────────────────────────────────
  {
    key: "regret_transition",
    label: "Regrets transitioning",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person express regret about having transitioned (medically or socially)?",
      {
        true: "Explicitly regrets transitioning or major elements of it",
        false: "No regret expressed, or regret only hypothetical/about others",
      },
    ),
    tag: "regrets transitioning",
  },
  {
    key: "no_regret",
    label: "Does not regret transitioning",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person express no regret, or only minimal and fully resolved regret, about their own transition decisions?",
      {
        true: "States they do not regret it / are at peace / transition was right for them",
        false: "No such statement, or regret is expressed",
      },
    ),
    tag: "doesn't regret transitioning",
  },
  {
    key: "regret_not_applicable",
    label: "Transition regret not applicable",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Is transition regret not applicable to this person because this account is not about their own transition experience (they never transitioned, only considered it, or the story is about someone else)?",
      {
        true: "Account is not about the person's own transition (never transitioned / considering / someone else's story)",
        false: "Account is about the person's own transition experience",
      },
    ),
  },
  {
    key: "regret_intensity",
    label: "Regret intensity",
    group: "regret",
    tier: "outcome",
    question: score(
      "How intense and persistent is the person's expressed regret?",
      [
        "No regret expressed; transition seen as right or neutral",
        "Mild or passing regret; mostly at peace",
        "Moderate regret; recurring distress about the decision",
        "Severe, persistent regret; central to their current suffering",
      ],
    ),
  },
  {
    key: "regret_trajectory",
    label: "Regret trajectory",
    group: "regret",
    tier: "outcome",
    question: choice(
      "How has the person's regret changed over the time covered?",
      {
        resolved: "Largely resolved or worked through",
        improving: "Clearly improving over time",
        stable: "Stable / unchanged",
        worsening: "Worsening over time",
        mixed: "Mixed, cyclical, or ambiguous",
      },
    ),
  },
  {
    key: "regret_hormones",
    label: "Regret hormones/body changes",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person specifically regret hormone-related or other permanent body changes (voice, hair, bone structure, etc.)?",
      {
        true: "Regrets hormone-related or permanent body changes specifically",
        false: "No such regret expressed",
      },
    ),
    tag: "hormone and body regret",
  },
  {
    key: "regret_top_surgery",
    label: "Regret top surgery",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person specifically regret top surgery (mastectomy or chest reconstruction)?",
      {
        true: "Regrets top surgery specifically",
        false: "No such regret, or surgery not had",
      },
    ),
    tag: "top surgery regret",
  },
  {
    key: "regret_bottom_surgery",
    label: "Regret bottom surgery",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person specifically regret bottom/genital surgery?",
      {
        true: "Regrets bottom/genital surgery specifically",
        false: "No such regret, or surgery not had",
      },
    ),
    tag: "bottom surgery regret",
  },
  {
    key: "regret_voice",
    label: "Regret voice changes",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person specifically regret voice changes or their voice being permanently altered?",
      {
        true: "Regrets voice changes specifically",
        false: "No such regret expressed",
      },
    ),
    tag: "voice change regret",
  },
  {
    key: "regret_fertility",
    label: "Regret fertility loss",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person regret lost fertility or infertility caused by transition?",
      {
        true: "Regrets lost fertility/infertility specifically",
        false: "No such regret expressed",
      },
    ),
    tag: "infertility regret",
  },
  {
    key: "regret_lost_time",
    label: "Regret lost time",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person regret the years lost to transition/medicalisation?",
      {
        true: "Regrets lost time/years specifically",
        false: "No such regret expressed",
      },
    ),
    tag: "lost time regret",
  },
  {
    key: "regret_social_loss",
    label: "Regret social losses",
    group: "regret",
    tier: "outcome",
    question: noul(
      "Does the person regret social losses caused by transition (relationships, community, reputation)?",
      {
        true: "Regrets social losses specifically",
        false: "No such regret expressed",
      },
    ),
    tag: "social loss regret",
  },

  // ── Medical ────────────────────────────────────────────────────────────────
  {
    key: "took_hormones",
    label: "Took hormones",
    group: "medical",
    tier: "cause",
    question: noul(
      "Does the account indicate the person took cross-sex hormones?",
    ),
    tag: "took hormones",
  },
  {
    key: "diy_hormones",
    label: "DIY hormones",
    group: "medical",
    tier: "cause",
    question: noul(
      "Does the account indicate hormones were obtained without medical supervision (DIY/grey market)?",
    ),
    tag: "DIY hormones",
  },
  {
    key: "took_puberty_blockers",
    label: "Took puberty blockers",
    group: "medical",
    tier: "cause",
    question: noul(
      "Does the account indicate the person took puberty blockers?",
    ),
    tag: "took puberty blockers",
  },
  {
    key: "top_surgery",
    label: "Top surgery",
    group: "medical",
    tier: "cause",
    question: noul(
      "Did the person have top surgery (mastectomy or chest reconstruction)?",
    ),
    tag: "got top surgery",
  },
  {
    key: "bottom_surgery",
    label: "Bottom surgery",
    group: "medical",
    tier: "cause",
    question: noul("Did the person have bottom/genital surgery?"),
    tag: "got bottom surgery",
  },
  {
    key: "facial_surgery",
    label: "Facial surgery",
    group: "medical",
    tier: "cause",
    question: noul(
      "Did the person have facial feminisation or masculinisation surgery?",
    ),
    tag: "got facial surgery",
  },
  {
    key: "medical_complications",
    label: "Medical complications",
    group: "medical",
    tier: "outcome",
    question: noul(
      "Does the account describe medical complications or serious side effects from transition treatments?",
    ),
    tag: "medical complications",
  },
  {
    key: "complication_severity",
    label: "Complication severity",
    group: "medical",
    tier: "outcome",
    question: score("How severe were the described medical complications?", [
      "No complications described",
      "Minor or manageable side effects",
      "Significant complications requiring treatment",
      "Severe, permanent, or life-altering harm",
    ]),
  },
  {
    key: "irreversible_changes",
    label: "Irreversible changes",
    group: "medical",
    tier: "outcome",
    question: noul(
      "Does the account describe irreversible physical changes that distress them (voice, fertility, surgical changes, etc.)?",
    ),
    tag: "irreversible changes",
  },
  {
    key: "now_infertile",
    label: "Now infertile",
    group: "medical",
    tier: "outcome",
    question: noul(
      "Does the account indicate the person is now infertile or medically unable to have biological children due to transition?",
    ),
    tag: "now infertile",
  },
  {
    key: "fertility_preservation_desire",
    label: "Fertility preservation desire",
    group: "medical",
    tier: "outcome",
    question: noul(
      "Does the person wish they had preserved fertility, or is fertility preservation a live concern?",
    ),
    tag: "fertility preservation desire",
  },
  {
    key: "ongoing_medical_needs",
    label: "Ongoing medical needs",
    group: "medical",
    tier: "outcome",
    question: noul(
      "Does the person describe ongoing medical needs related to transition (surveillance, medication, corrective procedures)?",
    ),
    tag: "ongoing medical needs",
  },
  {
    key: "healthcare_dissatisfaction",
    label: "Healthcare system dissatisfaction",
    group: "medical",
    tier: "outcome",
    question: noul(
      "Does the account express dissatisfaction with how clinicians/gender services handled their care (rushed, affirm-only, dismissive)?",
    ),
    tag: "healthcare system dissatisfaction",
  },

  // ── Mental health ──────────────────────────────────────────────────────────
  {
    key: "mh_autism",
    label: "Autism",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate the person is autistic (diagnosed or self-identified)?",
      {
        true: "Autism diagnosed or self-identified",
        false: "Not indicated",
      },
    ),
    tag: "autism/neurodivergence",
  },
  {
    key: "mh_adhd",
    label: "ADHD",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate the person has ADHD (diagnosed or self-identified)?",
    ),
    tag: "adhd",
  },
  {
    key: "mh_ocd",
    label: "OCD",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate obsessive-compulsive features, especially intrusive gender-related thoughts?",
    ),
    tag: "ocd intrusive thoughts",
  },
  {
    key: "mh_depression",
    label: "Depression",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate depression (diagnosed or described)?",
    ),
    tag: "depression",
  },
  {
    key: "mh_anxiety",
    label: "Anxiety",
    group: "mental_health",
    tier: "cause",
    question: noul("Does the account indicate significant anxiety?"),
    tag: "anxiety",
  },
  {
    key: "mh_bpd",
    label: "Borderline personality disorder",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate borderline personality disorder or unstable identity/relationships patterns?",
    ),
    tag: "borderline personality disorder",
  },
  {
    key: "mh_bipolar",
    label: "Bipolar disorder",
    group: "mental_health",
    tier: "cause",
    question: noul("Does the account indicate bipolar disorder?"),
    tag: "bipolar",
  },
  {
    key: "mh_psychosis",
    label: "Psychosis",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate psychosis or psychotic symptoms relevant to their gender history?",
    ),
    tag: "psychosis",
  },
  {
    key: "mh_eating_disorder",
    label: "Eating disorder",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate an eating disorder or disordered eating?",
    ),
    tag: "eating disorder",
  },
  {
    key: "mh_dissociation",
    label: "Dissociation/depersonalisation",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate dissociation, depersonalisation, or derealisation?",
    ),
    tag: "depersonalisation",
  },
  {
    key: "mh_self_harm",
    label: "Self-harm",
    group: "mental_health",
    tier: "cause",
    question: noul("Does the account indicate self-harm?"),
    tag: "self-harm",
  },
  {
    key: "mh_suicidal_ideation",
    label: "Suicidal ideation",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account indicate suicidal ideation or suicide attempts?",
      {
        true: "Suicidal ideation/attempts described",
        false: "Not described",
      },
    ),
    tag: "suicidal ideation",
  },
  {
    key: "mh_suicidality_since_detransition",
    label: "Suicidality since detransition",
    group: "mental_health",
    tier: "outcome",
    question: noul(
      "Does the account describe suicidal thoughts, self-harm crises, or a suicide attempt since detransitioning/stopping transition?",
      {
        true: "Suicidality/self-harm since detransition described",
        false: "Not described",
      },
    ),
    tag: "suicidality since detransition",
  },
  {
    key: "mh_suicidality_during_transition",
    label: "Suicidality during transition",
    group: "mental_health",
    tier: "process",
    question: noul(
      "Does the account describe suicidal thoughts, self-harm crises, or a suicide attempt during the person's transition (while they were transitioning or identifying as trans)?",
      {
        true: "Suicidality/self-harm during transition described",
        false:
          "Not described, or only before transition / only since detransition",
      },
    ),
    tag: "suicidality during transition",
  },
  {
    key: "mh_low_self_esteem",
    label: "Low self-esteem",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account convey deep low self-esteem or self-hatred?",
    ),
    tag: "low self-esteem",
  },
  {
    key: "mh_social_anxiety_isolation",
    label: "Social anxiety and isolation",
    group: "mental_health",
    tier: "outcome",
    question: noul(
      "Does the account describe pervasive social anxiety, loneliness, or isolation?",
    ),
    tag: "social anxiety and isolation",
  },
  {
    key: "mh_generic",
    label: "Mental health issues (generic)",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account describe significant mental health issues without a clear single diagnosis?",
    ),
    tag: "mental health issues",
  },
  {
    key: "mh_severity",
    label: "Mental health severity",
    group: "mental_health",
    tier: "cause",
    question: score("How severe is the mental health picture described?", [
      "No notable mental health issues",
      "Mild or situational distress",
      "Significant, treated conditions",
      "Severe conditions, hospitalisation, or crisis",
    ]),
  },
  {
    key: "mh_change_after_detransition",
    label: "Mental health change after detransition",
    group: "mental_health",
    tier: "outcome",
    question: score(
      "How has the person's mental health changed since detransitioning/stopping transition?",
      [
        "Much worse",
        "Somewhat worse",
        "About the same",
        "Somewhat better",
        "Much better",
      ],
    ),
  },
  {
    key: "body_dysmorphia",
    label: "Body dysmorphia",
    group: "mental_health",
    tier: "cause",
    question: noul(
      "Does the account describe body dysmorphia (distorted body perception) rather than gender dysphoria alone?",
    ),
    tag: "body dysmorphia",
  },

  // ── Adversity ──────────────────────────────────────────────────────────────
  {
    key: "adv_trauma_history",
    label: "Trauma history",
    group: "adversity",
    tier: "cause",
    question: noul(
      "Does the account describe significant past trauma (any kind)?",
    ),
    tag: "trauma history",
  },
  {
    key: "adv_childhood_abuse",
    label: "Childhood abuse",
    group: "adversity",
    tier: "cause",
    question: noul(
      "Does the account describe childhood abuse or neglect (physical, emotional, or sexual)?",
      {
        true: "Childhood abuse/neglect explicitly described",
        false: "Not described",
      },
    ),
    tag: "childhood abuse",
  },
  {
    key: "adv_sexual_assault",
    label: "Sexual assault",
    group: "adversity",
    tier: "cause",
    question: noul("Does the account describe sexual assault or molestation?", {
      true: "Sexual assault/molestation explicitly described",
      false: "Not described",
    }),
    tag: "sexual assault",
  },
  {
    key: "adv_bullying",
    label: "Bullying",
    group: "adversity",
    tier: "cause",
    question: noul(
      "Does the account describe bullying or harassment (including online)?",
    ),
    tag: "bullying",
  },
  {
    key: "adv_family_dysfunction",
    label: "Family dysfunction",
    group: "adversity",
    tier: "cause",
    question: noul(
      "Does the account describe a dysfunctional family environment beyond ordinary conflict?",
    ),
    tag: "family dysfunction",
  },

  // ── Social ─────────────────────────────────────────────────────────────────
  {
    key: "family_support",
    label: "Family support",
    group: "social",
    tier: "cause",
    question: score(
      "How supportive was the person's family across their transition/detransition?",
      [
        "Strongly unsupportive or rejecting",
        "Mostly unsupportive",
        "Mixed or neutral",
        "Mostly supportive",
        "Strongly supportive",
      ],
    ),
  },
  {
    key: "family_rejection",
    label: "Family rejection",
    group: "social",
    tier: "cause",
    question: noul(
      "Was the person rejected, disowned, or cut off by family in connection with transition/detransition?",
    ),
    tag: "unsupportive family",
  },
  {
    key: "social_isolation",
    label: "Social isolation",
    group: "social",
    tier: "outcome",
    question: noul(
      "Does the account describe social isolation or loss of community caused by detransition?",
    ),
    tag: "social isolation",
  },
  {
    key: "community_disillusionment",
    label: "Community disillusionment",
    group: "social",
    tier: "outcome",
    question: noul(
      "Does the account express disillusionment with the trans/LGBT community?",
    ),
    tag: "community disillusionment",
  },
  {
    key: "social_ostracism",
    label: "Social ostracism",
    group: "social",
    tier: "outcome",
    question: noul(
      "Does the account describe being ostracised, harassed, or treated as an outcast for detransitioning?",
    ),
    tag: "social ostracism",
  },
  {
    key: "peer_pressure",
    label: "Peer pressure",
    group: "social",
    tier: "cause",
    question: noul(
      "Does the account describe peer pressure or desire to fit in as a factor in their transition?",
    ),
    tag: "peer pressure",
  },
  {
    key: "relationship_difficulties",
    label: "Relationship difficulties",
    group: "social",
    tier: "outcome",
    question: noul(
      "Does the account describe recurring relationship or dating difficulties tied to transition/detransition?",
    ),
    tag: "relationship difficulties",
  },

  // ── Sexuality ──────────────────────────────────────────────────────────────
  {
    key: "sexuality_before",
    label: "Sexuality before transition",
    group: "sexuality",
    tier: "cause",
    question: choice(
      "What was the person's sexuality/orientation before transitioning (relative to their birth sex)?",
      {
        heterosexual: "Attracted to the opposite sex",
        homosexual: "Attracted to the same sex",
        bisexual: "Attracted to both",
        asexual: "Asexual or negligible attraction",
        other: "Other or changing patterns",
        unclear: "Not stated / unclear",
      },
    ),
  },
  {
    key: "sexuality_after",
    label: "Sexuality after detransition",
    group: "sexuality",
    tier: "outcome",
    question: choice(
      "What is the person's sexuality/orientation after detransitioning (relative to their birth sex)?",
      {
        heterosexual: "Attracted to the opposite sex",
        homosexual: "Attracted to the same sex",
        bisexual: "Attracted to both",
        asexual: "Asexual or negligible attraction",
        other: "Other or changing patterns",
        unclear: "Not stated / unclear",
      },
    ),
  },
  {
    key: "sexuality_changed",
    label: "Sexuality changed",
    group: "sexuality",
    tier: "outcome",
    question: noul(
      "Does the account describe their sexuality changing across transition/detransition?",
    ),
    tag: "sexuality changed",
  },
  {
    key: "internalised_homophobia",
    label: "Internalised homophobia",
    group: "sexuality",
    tier: "cause",
    question: noul(
      "Does the account describe internalised homophobia (discomfort with same-sex attraction) as a factor?",
      {
        true: "Explicit discomfort with same-sex attraction as a factor",
        false: "Not described",
      },
    ),
    tag: "internalised homophobia",
  },
  {
    key: "internalised_misogyny_misandry",
    label: "Internalised misogyny/misandry",
    group: "sexuality",
    tier: "cause",
    question: noul(
      "Does the account describe internalised misogyny or misandry (discomfort with their own sex) as a factor?",
      {
        true: "Discomfort with own sex / internalised sex-role bias as a factor",
        false: "Not described",
      },
    ),
    tag: "internalised misogyny / misandry",
  },

  // ── Online / media ─────────────────────────────────────────────────────────
  {
    key: "platform_primary",
    label: "Primary online platform",
    group: "online",
    tier: "cause",
    question: choice(
      "If online spaces influenced them, which platform was most significant?",
      {
        reddit: "Reddit",
        tumblr: "Tumblr",
        tiktok: "TikTok",
        twitter: "Twitter/X",
        youtube: "YouTube",
        discord: "Discord",
        other: "Other platform or fandom space",
        none: "No significant online influence",
      },
    ),
  },
  {
    key: "online_community_disillusionment",
    label: "Online community disillusionment",
    group: "online",
    tier: "outcome",
    question: noul(
      "Does the account express disillusionment with online trans communities specifically?",
    ),
    tag: "online community disillusionment",
  },
  {
    key: "ideological_involvement",
    label: "Ideological involvement",
    group: "online",
    tier: "cause",
    question: noul(
      "Was the person deeply involved in gender/LGBT ideology or activism (not just identity)?",
    ),
    tag: "ideological involvement",
  },

  // ── Quality / authenticity ─────────────────────────────────────────────────
  {
    key: "quality_suspicious_account",
    label: "Suspicious account",
    group: "quality",
    tier: "outcome",
    question: noul(
      "Does the account appear inauthentic, fabricated, bot-like, or in bad faith (judge from the narrative itself)?",
      {
        true: "Indicators of fabrication, bad faith, or bot-like behaviour",
        false: "Consistent, specific, plausible first-person account",
      },
    ),
    tag: "suspicious account",
    threshold: 0.6,
  },
  {
    key: "quality_account_type",
    label: "Account type",
    group: "quality",
    tier: "cause",
    question: choice("Is this account posting from personal experience?", {
      personal_experience: "A person describing their own experience",
      parent: "A parent describing their child's experience",
      friend: "A friend/partner describing someone else's experience",
      researcher_journalist: "A researcher, journalist, or clinician",
      other: "Other or mixed perspective",
    }),
  },
  {
    key: "quality_detail_level",
    label: "Narrative detail",
    group: "quality",
    tier: "outcome",
    question: score(
      "How detailed and specific is the first-person narrative?",
      [
        "Vague, generic, or no personal detail",
        "Some personal detail but shallow",
        "Reasonably detailed with concrete events",
        "Highly detailed, specific, multi-year first-person account",
      ],
    ),
  },

  // ── Outcomes ───────────────────────────────────────────────────────────────
  {
    key: "outcome_quality_of_life",
    label: "Quality of life change",
    group: "outcomes",
    tier: "outcome",
    question: score(
      "How has the person's overall quality of life changed since detransitioning/stopping transition?",
      [
        "Much worse",
        "Somewhat worse",
        "About the same",
        "Somewhat better",
        "Much better",
      ],
    ),
  },
  {
    key: "outcome_body_reconciliation",
    label: "Body reconciliation",
    group: "outcomes",
    tier: "outcome",
    question: noul(
      "Does the person describe reaching acceptance or reconciliation with their body/sex?",
    ),
    tag: "body reconciliation",
  },
  {
    key: "outcome_family_relationship_change",
    label: "Family relationship change",
    group: "outcomes",
    tier: "outcome",
    question: score(
      "How have family relationships changed since detransitioning?",
      [
        "Much worse or ruined",
        "Somewhat worse",
        "About the same",
        "Somewhat better",
        "Much better or restored",
      ],
    ),
  },
  {
    key: "outcome_career_education_impact",
    label: "Career/education impact",
    group: "outcomes",
    tier: "outcome",
    question: noul(
      "Does the account describe significant negative impact on education, career, or finances from transition/detransition?",
    ),
    tag: "career or education impact",
  },
  {
    key: "outcome_detrans_support_network",
    label: "Detrans support network",
    group: "outcomes",
    tier: "outcome",
    question: noul(
      "Does the person have or seek a supportive detransition network (community, friends, family) in their life now?",
    ),
    tag: "detransition support",
  },
  {
    key: "attitude_towards_transition_for_others",
    label: "Attitude toward transition for others",
    group: "attitudes",
    tier: "outcome",
    question: choice(
      "What is the person's expressed attitude toward transition for other people (not themselves)?",
      {
        supportive:
          "Supports transition for others, at least when it is well-considered",
        conditional:
          "Supports only under strict conditions (adults, thorough screening, genuine dysphoria), otherwise cautious",
        critical:
          "Generally critical of transition as a solution, while not necessarily opposing it for everyone",
        opposed:
          "Opposes medical transition for others, broadly or for specific groups (e.g. minors)",
        not_addressed:
          "Attitude toward others' transitions is not meaningfully addressed",
      },
    ),
  },
];

/** Groups for later UI display, in presentation order. */
export const FEATURE_GROUPS = [
  "reasons",
  "causes",
  "processes",
  "regret",
  "medical",
  "mental_health",
  "adversity",
  "social",
  "sexuality",
  "online",
  "identity",
  "outcomes",
  "attitudes",
  "quality",
] as const;

export function featureByKey(key: string): FeatureDef | undefined {
  return featureTaxonomy.find((f) => f.key === key);
}

/** Noul threshold for a feature (defaults to DEFAULT_NOUL_THRESHOLD). */
export function thresholdFor(feature: FeatureDef): number {
  return feature.threshold ?? DEFAULT_NOUL_THRESHOLD;
}
