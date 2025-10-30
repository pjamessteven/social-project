export const availableTags = [
  "trauma",
  "autism/neurodivergence",
  "adhd",
  "ocd intrusive thoughts",
  "puberty discomfort",
  "got top surgery",
  "got facial surgery",
  "got top surgery as part of male detransition",
  "got bottom surgery",
  "internalised homophobia",
  "internalised misogyny",
  "internalised misandry",
  "autogynephilia",
  "autoandrophilia",
  "started as non-binary",
  "escapism",
  "depression",
  "low self-esteem",
  "social anxiety and isolation",
  "bipolar",
  "borderline personality disorder",
  "suicidal ideation",
  "self-harm",
  "porn influence",
  "anime influence",
  "influenced online",
  "influenced by friends",
  "hated breasts",
  "benefited from non-affirming therapy",
  "eating disorder",
  "parental or medical coercion",
  "completely regrets transition",
  "partially regrets transition",
  "doesn't regret transition",
  "trans kid",
  "feminine boy",
  "tomboy",
  "took hormones",
  "DIY hormones",
  "took puberty blockers",
  "surgery complications",
  "medical complications",
  "now infertile",
  "body dysmorphia",
  "re-transitioned",
  "rapid onset gender dysphoria (ROGD)",
  "benefited from psychedelic drugs",
  "had religious background",
  "became religious",
  "only transitioned socially",
  "intersex",
  "asexual",
  "homosexual",
  "heterosexual",
  "bisexual",
  "sexuality changed",
  "social role discomfort",
  "fear of sexualization",
  "psychosis clarity",
  "depersonalisation",
  "mental health issues",
  "underlying health issues",
  "suspicious account",
  "hair loss",
  "chronic pain",
  "weight gain/loss",
  "bone density issues",
  "unsupportive family",
  "supportive family",
  "is parent (not trans themselves)",
  "is friend (not trans themselves)",
  "is researcher (not trans themselves)",
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
