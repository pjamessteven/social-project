/**
 * Backfill per-locale URL slugs (`study_slugs`) for existing studies.
 *
 * Run once after deploying the study slug migration (0011_add_study_slugs):
 *   npx tsx scripts/backfill-study-slugs.ts
 *
 * Slugs derive from each study's localized headline/title and are regenerated
 * in study-id order, so on collisions the earliest study keeps the bare slug.
 */
import * as dotenv from "dotenv";
import { asc } from "drizzle-orm";
import { syncStudySlugs } from "../app/lib/study-slugs";
import { db } from "../db";
import { studies } from "../db/schema";

dotenv.config();

async function main() {
  const allStudies = await db
    .select({ id: studies.id, headline: studies.headline })
    .from(studies)
    .orderBy(asc(studies.id));

  console.log(`Backfilling URL slugs for ${allStudies.length} studies...`);

  let generated = 0;
  let errors = 0;

  for (const [index, study] of allStudies.entries()) {
    try {
      await syncStudySlugs(study.id);
      generated++;
      console.log(
        `  [${index + 1}/${allStudies.length}] study ${study.id}: ${study.headline || "(untitled)"}`,
      );
    } catch (error) {
      errors++;
      console.error(`  ❌ Failed for study ${study.id}:`, error);
    }
  }

  console.log("\n📊 Slug Backfill Summary:");
  console.log(`✅ Studies with slugs generated: ${generated}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📝 Total: ${allStudies.length}`);
}

main()
  .catch((error) => {
    console.error("Error in main process:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    // The shared pool keeps the process alive otherwise
    process.exit(process.exitCode ?? 0);
  });
