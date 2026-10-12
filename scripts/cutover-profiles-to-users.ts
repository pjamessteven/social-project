#!/usr/bin/env tsx
/**
 * Cutover: write the processed profiles (run 3) into the live detrans_users table.
 *
 * For every user in the profile run:
 *   * inserts new rows for cohort members not yet in detrans_users
 *   * updates experience / summary / sex / ages / active_since for existing rows
 *   * clears stale translations and the legacy red-flags fields (those outputs
 *     are no longer generated; translations must be regenerated after cutover)
 *   * leaves transition_reason_id / detransition_reason_id to the tag sync step
 *
 * Usage:
 *   npx tsx scripts/cutover-profiles-to-users.ts --profiles-run-id 3 [--dry-run]
 */
import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  detransUserProfiles,
  detransUserTimelines,
  detransUsers,
} from "../db/schema";

/** Reference a column from the upsert's excluded row. */
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

interface Options {
  profilesRunId: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { profilesRunId: 0, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--profiles-run-id") {
      opts.profilesRunId = parseInt(argv[++i] ?? "", 10);
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!opts.profilesRunId) throw new Error("--profiles-run-id is required");
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: 4 });
  const db = drizzle(client);

  console.log("=== Cutover: profiles -> detrans_users ===");
  console.log(`Mode:         ${opts.dryRun ? "DRY RUN" : "WRITE"}`);
  console.log(`Profiles run: ${opts.profilesRunId}`);

  const rows = await db
    .select({
      username: detransUserProfiles.username,
      experience: detransUserProfiles.experience,
      summary: detransUserProfiles.experienceSummary,
      sex: detransUserProfiles.sex,
      firstItemDate: detransUserProfiles.firstItemDate,
      transitionAge: detransUserTimelines.transitionAge,
      detransitionAge: detransUserTimelines.detransitionAge,
      hormonesAge: detransUserTimelines.hormonesAge,
      topSurgeryAge: detransUserTimelines.topSurgeryAge,
      bottomSurgeryAge: detransUserTimelines.bottomSurgeryAge,
      pubertyBlockersAge: detransUserTimelines.pubertyBlockersAge,
    })
    .from(detransUserProfiles)
    .leftJoin(
      detransUserTimelines,
      and(
        eq(detransUserTimelines.runId, detransUserProfiles.runId),
        eq(detransUserTimelines.username, detransUserProfiles.username),
      ),
    )
    .where(eq(detransUserProfiles.runId, opts.profilesRunId));

  console.log(`Profiles:     ${rows.length}`);

  const existing = await db
    .select({ username: detransUsers.username })
    .from(detransUsers);
  const existingSet = new Set(existing.map((r) => r.username));
  const inserts = rows.filter((r) => !existingSet.has(r.username)).length;
  const updates = rows.length - inserts;
  console.log(`Inserts:      ${inserts}`);
  console.log(`Updates:      ${updates}`);

  if (opts.dryRun) {
    console.log("\n(dry run — nothing written)");
    await client.end();
    return;
  }

  let done = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const values = batch.map((r) => ({
      username: r.username,
      activeSince: r.firstItemDate ?? new Date(),
      sex: r.sex === "m" || r.sex === "f" ? r.sex : "f",
      experience: r.experience,
      experienceSummary: r.summary,
      experienceTranslation: null,
      experienceSummaryTranslation: null,
      redFlagsReport: null,
      redFlagsReportTranslation: null,
      transitionAge: r.transitionAge,
      detransitionAge: r.detransitionAge,
      hormonesAge: r.hormonesAge,
      topSurgeryAge: r.topSurgeryAge,
      bottomSurgeryAge: r.bottomSurgeryAge,
      pubertyBlockersAge: r.pubertyBlockersAge,
    }));

    await db
      .insert(detransUsers)
      .values(values)
      .onConflictDoUpdate({
        target: detransUsers.username,
        set: {
          activeSince: excluded("active_since"),
          sex: excluded("sex"),
          experience: excluded("experience"),
          experienceSummary: excluded("experience_summary"),
          experienceTranslation: excluded("experience_translation"),
          experienceSummaryTranslation: excluded(
            "experience_summary_translation",
          ),
          redFlagsReport: excluded("red_flags_report"),
          redFlagsReportTranslation: excluded("red_flags_report_translation"),
          transitionAge: excluded("transition_age"),
          detransitionAge: excluded("detransition_age"),
          hormonesAge: excluded("hormones_age"),
          topSurgeryAge: excluded("top_surgery_age"),
          bottomSurgeryAge: excluded("bottom_surgery_age"),
          pubertyBlockersAge: excluded("puberty_blockers_age"),
        },
      });

    done += batch.length;
    if (done % 1000 === 0 || done === rows.length) {
      console.log(`  written ${done}/${rows.length}`);
    }
  }

  const finalCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(detransUsers);
  console.log(`detrans_users total: ${finalCount[0]?.count}`);
  console.log("Cutover complete.");
  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
