export const availableTags = [
  "trauma",
  "autistic",
  "ocd",
  "puberty discomfort",
  "got top surgery",
  "got bottom surgery",
  "internalised homophobia",
  "autogynephilia (AGP)",
  "started as non-binary",
  "escapism",
  "depression",
  "low self-esteem",
  "anxiety",
  "porn problem",
  "hated breasts",
  "benefited from non-affirming therapy",
  "eating disorder",
  "influenced online",
  "influenced by friends",
  "regrets transitioning",
  "doesn't regret transitioning",
  "trans kid",
  "took hormones",
  "took puberty blockers",
  "serious health complications",
  "now infertile",
  "body dysmorphia",
  "retransition",
  "benefited from psychedelic drugs",
  "became religious",
  "become non-religious",
  "only transitioned socially",
  "intersex",
  "asexual",
  "homosexual",
  "heterosexual",
  "bisexual",
  "sexuality changed",
  "suspicious account",
];

export const SankeyFlow = [
  // Stage 1: Demographics
  {
    stage: "sex",
    categories: ["Male", "Female"],
    label: "Biological Sex"
  },
  // Stage 2: Transition Age
  {
    stage: "transition_age",
    categories: ["before_18", "after_18"],
    label: "Transition Age"
  },
  // Stage 3: Medical Interventions
  {
    stage: "medical",
    categories: ["took_hormones", "got_surgery", "social_only"],
    label: "Medical Interventions"
  },
  // Stage 4: Outcome
  {
    stage: "outcome", 
    categories: ["regrets", "no_regrets"],
    label: "Transition Outcome"
  }
];

export const SankeyTagMappings = {
  sexuality: {
    "homosexual": "homosexual",
    "heterosexual": "heterosexual", 
    "bisexual": "bisexual",
    "asexual": "asexual"
  },
  medical: {
    "hormones": "took_hormones",
    "testosterone": "took_hormones",
    "estrogen": "took_hormones",
    "top surgery": "got_surgery",
    "mastectomy": "got_surgery", 
    "bottom surgery": "got_surgery",
    "social transition": "social_only",
    "no medical transition": "social_only"
  },
  outcome: {
    "regret": "regrets",
    "regret absent": "no_regrets",
    "regret avoided": "no_regrets"
  }
};
