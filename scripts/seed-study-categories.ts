/**
 * Seed the curated study categories (topics + methods) for the /studies hub.
 *
 * Idempotent: inserts missing categories by (kind, slug) and leaves existing
 * rows alone (admins may have edited them). Pass --update to overwrite the
 * English name/description/sort order of existing rows from this list (their
 * translations are cleared so the translation script regenerates them).
 *
 * Usage:
 *   npx tsx scripts/seed-study-categories.ts [--update]
 * Then: npx tsx scripts/generate-study-hub-translations.ts
 */

import * as dotenv from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { studyCategories } from "../db/schema";

dotenv.config();

const client = postgres(
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app",
);
const db = drizzle(client);

type Seed = {
  kind: "topic" | "method";
  slug: string;
  name: string;
  description: string;
};

export const STUDY_CATEGORY_SEEDS: Seed[] = [
  // Topics — what a study is about
  {
    kind: "topic",
    slug: "detransition",
    name: "Detransition & regret",
    description:
      "How many people stop or reverse a gender transition, why they do it, and what they report about the experience.",
  },
  {
    kind: "topic",
    slug: "detransitioner-care",
    name: "Detransitioner care & support",
    description:
      "The medical, psychological and social needs of people who detransition, and the gaps in the services available to them.",
  },
  {
    kind: "topic",
    slug: "childhood-desistance",
    name: "Childhood desistance",
    description:
      "Follow-up studies of gender-dysphoric children, many of whom no longer experience dysphoria after puberty.",
  },
  {
    kind: "topic",
    slug: "puberty-blockers",
    name: "Puberty blockers",
    description:
      "Evidence on suppressing puberty in gender-dysphoric young people, including mental health, bone and fertility outcomes.",
  },
  {
    kind: "topic",
    slug: "cross-sex-hormones",
    name: "Cross-sex hormones",
    description:
      "Outcomes, continuation rates and side effects of testosterone and estrogen treatment.",
  },
  {
    kind: "topic",
    slug: "surgery",
    name: "Surgery",
    description:
      "Results and complications of gender-related surgeries such as mastectomy and genital surgery.",
  },
  {
    kind: "topic",
    slug: "mental-health",
    name: "Mental health & suicide",
    description:
      "Psychiatric outcomes, suicidality and mortality before and after medical transition.",
  },
  {
    kind: "topic",
    slug: "co-occurring-conditions",
    name: "Autism, trauma & co-occurring conditions",
    description:
      "How autism, trauma and other mental health conditions overlap with gender dysphoria and shape outcomes.",
  },
  {
    kind: "topic",
    slug: "rising-diagnoses",
    name: "Rising diagnoses & social influence",
    description:
      "The sharp rise in gender dysphoria referrals, the shift toward adolescent girls, and the role of peers and social media.",
  },
  {
    kind: "topic",
    slug: "exploratory-therapy",
    name: "Exploratory therapy",
    description:
      "Psychological approaches that explore the causes of gender distress before, or instead of, medical intervention.",
  },
  {
    kind: "topic",
    slug: "guidelines-and-policy",
    name: "Guidelines & policy",
    description:
      "National evidence reviews, clinical guidelines and policy changes in youth gender medicine.",
  },
  {
    kind: "topic",
    slug: "medical-ethics",
    name: "Medical ethics & consent",
    description:
      "Informed consent, autonomy, and the risk of harm from medical interventions in gender medicine.",
  },
  {
    kind: "topic",
    slug: "sex-and-biology",
    name: "Sex, biology & sport",
    description:
      "Research on biological sex, sex differences in the body and brain, and fairness in sport.",
  },

  // Methods — how a study was done
  {
    kind: "method",
    slug: "systematic-reviews",
    name: "Systematic & evidence reviews",
    description:
      "Systematic reviews, meta-analyses and official evidence reviews that gather and grade all the available research on a question. When done well, the strongest form of evidence.",
  },
  {
    kind: "method",
    slug: "cohort-studies",
    name: "Cohort & registry studies",
    description:
      "Studies that follow groups of patients over time, often using clinic records or national health registers.",
  },
  {
    kind: "method",
    slug: "surveys",
    name: "Surveys",
    description:
      "Questionnaires completed by detransitioners, patients, parents or clinicians.",
  },
  {
    kind: "method",
    slug: "qualitative-research",
    name: "Interviews & qualitative research",
    description:
      "In-depth interviews and first-person accounts, analysed for common themes.",
  },
  {
    kind: "method",
    slug: "case-reports",
    name: "Case reports",
    description:
      "Detailed accounts of individual patients or small clinical series.",
  },
  {
    kind: "method",
    slug: "commentary",
    name: "Commentary & analysis",
    description:
      "Expert opinion, ethical analysis, theoretical papers and critiques of existing research.",
  },
];

async function main() {
  const update = process.argv.includes("--update");
  let inserted = 0;
  let updated = 0;

  for (const [index, seed] of STUDY_CATEGORY_SEEDS.entries()) {
    const sortOrder = index * 10;
    const [existing] = await db
      .select()
      .from(studyCategories)
      .where(
        and(
          eq(studyCategories.kind, seed.kind),
          eq(studyCategories.slug, seed.slug),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(studyCategories).values({ ...seed, sortOrder });
      inserted++;
      continue;
    }

    if (update) {
      await db
        .update(studyCategories)
        .set({
          name: seed.name,
          description: seed.description,
          sortOrder,
          nameTranslation:
            existing.name === seed.name ? existing.nameTranslation : null,
          descriptionTranslation:
            existing.description === seed.description
              ? existing.descriptionTranslation
              : null,
          updatedAt: new Date(),
        })
        .where(eq(studyCategories.id, existing.id));
      updated++;
    }
  }

  console.log(`Inserted ${inserted}, updated ${updated} study categories.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => client.end());
}
