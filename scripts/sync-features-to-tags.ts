#!/usr/bin/env tsx
/**
 * Derive canonical tags + reasons from Jev features.
 *
 * `--shadow` (default): read-only report comparing would-be tags against the
 * current detrans_tags / detrans_user_tags / reason assignments.
 *
 * `--commit`: rebuild the derived layer:
 *   1. upsert canonical tag rows (reusing existing rows/translations by name)
 *   2. ensure tag-type rows (feature / transition reason / detransition reason)
 *   3. delete existing detrans_user_tags rows for the cohort and reinsert
 *      from features (reason tags included)
 *   4. update detrans_users.transition_reason_id / detransition_reason_id
 *   5. delete retired (non-canonical) tag rows
 *
 * Usage:
 *   npx tsx scripts/sync-features-to-tags.ts [--features-run-id 4] [--commit]
 *
 * Without --features-run-id the latest answer per (username, feature) across
 * all feature runs is used, so incrementally added questions are picked up.
 */
import "dotenv/config";
import { eq, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  detransFeatures,
  detransTagTypes,
  detransTags,
  detransUserFeatures,
  detransUserTags,
  detransUsers,
} from "../db/schema";

// ── CLI ─────────────────────────────────────────────────────────────────────

interface Options {
  featuresRunId: number | null;
  commit: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { featuresRunId: null, commit: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--features-run-id") {
      opts.featuresRunId = parseInt(argv[++i] ?? "", 10);
    } else if (arg === "--commit") {
      opts.commit = true;
    } else if (arg === "--shadow") {
      opts.commit = false;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!opts.featuresRunId) {
    // merged mode: latest answer per feature across all runs
  }
  return opts;
}

// ── Old-tag consolidation map (reporting only; commit rebuilds from scratch) ─

const ALIASES: Record<string, string | null> = {
  // identity renames / merges
  "biological sex realisation": "accepted sexed body",
  "body reconciliation realisation": "body reconciliation",
  "gender role realisation": "social construct realisation",
  "social role realisation": "social construct realisation",
  "identity realisation": null,
  "realisation of true self": null,
  // health / medical
  "health complications": "medical complications",
  "medical patient aversion": "healthcare system dissatisfaction",
  "medical system disillusionment": "ideological disillusionment",
  "unwanted physical changes realisation":
    "surgery regret / medical complications",
  "surgery regret and lack of resolution":
    "surgery regret / medical complications",
  "infertility regret and lack of resolution": "infertility regret",
  "hormone-induced dysphoria": null,
  "underlying health issues": null,
  "neurological health focus": null,
  "financial and legal barriers": null,
  // mental health
  "ocd realisation": "mental health realisation",
  "mental health issues resolved": "mental health realisation",
  "mental health issues not resolved": "mental health realisation",
  "mental health issues realisation": "mental health realisation",
  "psychosis clarity": "mental health realisation",
  "autism/neurodivergence realisation": "neurodivergence realisation",
  // ideology / disillusionment
  "ideology disillusionment": "ideological disillusionment",
  "ideological shift realisation": "ideological disillusionment",
  "social system disillusionment": "ideological disillusionment",
  // social
  "failure to pass and social ostracism": "failure to pass",
  "social pressure": "social pressure / ostracism",
  "social isolation and incompatibility": "social isolation",
  "dating isolation and incompatibility": "relationship difficulties",
  "community and role model exposure": "exposure to detrans community",
  // sexuality / internalised
  "internalised misogyny": "internalised misogyny / misandry",
  "internalised misandry": "internalised misogyny / misandry",
  "internalised misogyny realisation":
    "internalised misogyny / misandry realisation",
  "internalised misandry realisation":
    "internalised misogyny / misandry realisation",
  "autogynephilia realisation": "sexual factors realisation (AGP/AAP)",
  "autoandrophilia realisation": "sexual factors realisation (AGP/AAP)",
  // religious
  "religious changes": "religious or spiritual change",
  "religious faith conflict": "religious or spiritual change",
  "religious trauma realisation": "religious or spiritual change",
  "spiritual healing experience": "spiritual experience",
  // family / fertility
  "desire for family": "fertility or family desires",
  "maternal role realisation": "fertility or family desires",
  // misc merges
  "therapy and self realisation": "benefited from non-affirming therapy",
  "exhaustion from performance": "fantasy-reality disillusionment",
  "fantasy reality disillusionment": "fantasy-reality disillusionment",
  "porn problem": "porn influence",
  "took drugs": "psychedelic drugs",
  "never loved herself": "low self-esteem",
  "parental approval seeking": "parental or medical coercion",
  "conversion therapy coercion": "parental or medical coercion",
  "** trauma": "trauma history",
  "** trauma realisation": "trauma realisation",
  // retired (no canonical equivalent)
  "trans kid": null,
  "started as non-binary": null,
  intersex: null,
  "hated breasts": null,
  "identity validation pressure": null,
  "desire for femininity": null,
  "desire for physical changes": null,
  "had religious background": null,
  "researcher no personal experience": null,
  "sexuality changed": null,
  homosexual: null,
  heterosexual: null,
  bisexual: null,
  asexual: null,
  "cultural reconnection and acceptance": null,
  "environmental change and personal growth": null,
  "forced cessation and reflection": null,
  "family responsibility guilt": null,
  "natural development resolution": null,
  "relationship objectification realisation": null,
  "relationship preservation fear": null,
  "social environment change": null,
};

// ── Derivation ──────────────────────────────────────────────────────────────

interface FeatureRow {
  id: number;
  key: string;
  tagName: string | null;
  tagType: string | null;
  threshold: number | null;
  choiceTagMap: Record<string, string> | null;
  choiceTagThreshold: number | null;
  kind: string;
}

interface AnswerRow {
  username: string;
  kind: string;
  noul: number | null;
  choice: string | null;
  probabilities: Record<string, number> | null;
  featureId: number;
}

function deriveTags(
  features: FeatureRow[],
  answers: AnswerRow[],
): {
  tagUsers: Map<string, Set<string>>;
  tagTypes: Map<string, Set<string>>;
  reasons: Map<string, { transition?: string; detransition?: string }>;
} {
  const featureById = new Map<number, FeatureRow>();
  for (const f of features) {
    featureById.set(f.id, f);
  }

  const tagUsers = new Map<string, Set<string>>();
  const tagTypes = new Map<string, Set<string>>();
  const reasons = new Map<
    string,
    { transition?: string; detransition?: string }
  >();

  const add = (tag: string, type: string, username: string) => {
    let set = tagUsers.get(tag);
    if (!set) {
      set = new Set();
      tagUsers.set(tag, set);
    }
    set.add(username);
    let types = tagTypes.get(tag);
    if (!types) {
      types = new Set();
      tagTypes.set(tag, types);
    }
    types.add(type);
  };

  for (const a of answers) {
    const f = featureById.get(a.featureId);
    if (!f) continue;

    if (
      a.kind === "noul" &&
      f.tagName &&
      (a.noul ?? 0) >= (f.threshold ?? 0.8)
    ) {
      add(f.tagName, f.tagType ?? "feature", a.username);
    }

    if (a.kind === "choice" && f.choiceTagMap) {
      let tag = f.choiceTagMap[a.choice ?? ""];
      const winningProb = a.probabilities?.[a.choice ?? ""] ?? 1;
      if (!tag || winningProb < (f.choiceTagThreshold ?? 0.4)) {
        tag = f.choiceTagMap["other_unclear"] ?? tag;
      }
      if (!tag) continue;
      add(tag, f.tagType ?? "feature", a.username);
      const entry = reasons.get(a.username) ?? {};
      if (f.tagType === "transition reason") entry.transition = tag;
      else if (f.tagType === "detransition reason") entry.detransition = tag;
      reasons.set(a.username, entry);
    }
  }

  return { tagUsers, tagTypes, reasons };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: 8 });
  const db = drizzle(client);

  console.log("=== Tag sync (Jev features -> canonical tags) ===");
  console.log(`Mode:         ${opts.commit ? "COMMIT" : "shadow (read-only)"}`);
  console.log(
    `Features run: ${opts.featuresRunId ?? "latest per feature (merged)"}`,
  );

  const featureRows = (await db
    .select()
    .from(detransFeatures)
    .where(eq(detransFeatures.enabled, true))) as unknown as FeatureRow[];
  console.log(`Features:     ${featureRows.length}`);

  let answers: AnswerRow[];
  if (opts.featuresRunId) {
    answers = (await db
      .select({
        username: detransUserFeatures.username,
        kind: detransUserFeatures.kind,
        noul: detransUserFeatures.noul,
        choice: detransUserFeatures.choice,
        probabilities: detransUserFeatures.probabilities,
        featureId: detransUserFeatures.featureId,
      })
      .from(detransUserFeatures)
      .where(
        eq(detransUserFeatures.runId, opts.featuresRunId),
      )) as unknown as AnswerRow[];
  } else {
    // Latest answer per (username, feature) across runs: later runs may add
    // individual questions without re-extracting everything.
    const result: any = await db.execute(sql`
      SELECT DISTINCT ON (username, feature_id)
        username,
        kind,
        noul,
        choice,
        probabilities,
        feature_id AS "featureId"
      FROM detrans_user_features
      ORDER BY username, feature_id, run_id DESC
    `);
    answers = (result?.rows ?? result) as AnswerRow[];
  }
  console.log(`Answers:      ${answers.length}`);
  console.log();

  const { tagUsers, tagTypes, reasons } = deriveTags(featureRows, answers);

  // Canonical names.
  const canonical = new Set<string>();
  for (const f of featureRows) {
    if (f.tagName) canonical.add(f.tagName);
    if (f.choiceTagMap) {
      for (const t of Object.values(f.choiceTagMap)) canonical.add(t);
    }
  }

  // Existing tag counts.
  const existingRows: any = await db.execute(sql`
    SELECT t.name, count(ut.username) AS users
    FROM detrans_tags t LEFT JOIN detrans_user_tags ut ON ut.tag_id = t.id
    GROUP BY t.name
  `);
  const existing: any[] = existingRows?.rows ?? existingRows;
  const oldCounts = new Map<string, number>(
    existing.map((r) => [r.name as string, Number(r.users)]),
  );

  // Existing reason assignments.
  const oldReasons: any = await db.execute(sql`
    SELECT u.username, tt.name AS transition_tag, dt.name AS detransition_tag
    FROM detrans_users u
    LEFT JOIN detrans_tags tt ON tt.id = u.transition_reason_id
    LEFT JOIN detrans_tags dt ON dt.id = u.detransition_reason_id
  `);
  const oldReasonRows: any[] = oldReasons?.rows ?? oldReasons;
  let transitionChanged = 0;
  let detransitionChanged = 0;
  for (const r of oldReasonRows) {
    const next = reasons.get(r.username);
    if (!next) continue;
    if (next.transition && next.transition !== r.transition_tag)
      transitionChanged++;
    if (next.detransition && next.detransition !== r.detransition_tag)
      detransitionChanged++;
  }

  // Report: canonical tags with new vs old counts.
  const canonicalSorted = [...canonical].sort(
    (a, b) => (tagUsers.get(b)?.size ?? 0) - (tagUsers.get(a)?.size ?? 0),
  );
  console.log("CANONICAL TAGS (new users vs old user_tags count):");
  console.log(
    "  " + "tag".padEnd(48) + "new".padStart(6) + "old".padStart(7) + "  types",
  );
  for (const tag of canonicalSorted) {
    const newCount = tagUsers.get(tag)?.size ?? 0;
    const oldCount = oldCounts.get(tag) ?? 0;
    const types = [...(tagTypes.get(tag) ?? [])].join(",");
    console.log(
      "  " +
        tag.padEnd(48) +
        String(newCount).padStart(6) +
        String(oldCount).padStart(7) +
        "  " +
        types,
    );
  }

  // Report: retired old tags (not canonical), with alias targets.
  const retired = [...oldCounts.entries()]
    .filter(([name]) => !canonical.has(name))
    .sort((a, b) => b[1] - a[1]);
  console.log();
  console.log(
    `RETIRED OLD TAGS (${retired.length}) — mapped target in brackets:`,
  );
  for (const [name, count] of retired) {
    const target =
      name === "null"
        ? "other / unclear (transition|detransition)"
        : ALIASES[name] === undefined
          ? "(unmapped / dropped)"
          : ALIASES[name] === null
            ? "(dropped)"
            : `-> ${ALIASES[name]}`;
    console.log(`  ${String(count).padStart(6)}  ${name} ${target}`);
  }

  const newUserTagRows = [...tagUsers.values()].reduce(
    (s, set) => s + set.size,
    0,
  );
  const oldUserTagRows = existing.reduce(
    (s: number, r: any) => s + Number(r.users),
    0,
  );
  console.log();
  console.log("SUMMARY:");
  console.log(`  canonical tags:        ${canonical.size}`);
  console.log(
    `  would-be user_tags:    ${newUserTagRows} (old: ${oldUserTagRows})`,
  );
  console.log(
    `  transition reason changes:    ${transitionChanged}/${oldReasonRows.length}`,
  );
  console.log(
    `  detransition reason changes:  ${detransitionChanged}/${oldReasonRows.length}`,
  );

  if (!opts.commit) {
    console.log("\n(shadow mode — nothing written; re-run with --commit)");
    await client.end();
    return;
  }

  // ── Commit ────────────────────────────────────────────────────────────────
  console.log("\nCommitting...");

  // 1. Upsert canonical tags.
  for (const tag of canonical) {
    await db.insert(detransTags).values({ name: tag }).onConflictDoNothing();
  }
  const tagIdByName = new Map<string, number>();
  const allTags = await db
    .select({ id: detransTags.id, name: detransTags.name })
    .from(detransTags);
  for (const t of allTags) tagIdByName.set(t.name, t.id);

  // 2. Ensure tag types.
  const existingTypes = await db
    .select({ tagId: detransTagTypes.tagId, type: detransTagTypes.type })
    .from(detransTagTypes);
  const typeSet = new Set(existingTypes.map((t) => `${t.tagId}|${t.type}`));
  for (const [tag, types] of tagTypes) {
    const tagId = tagIdByName.get(tag);
    if (!tagId) continue;
    for (const type of types) {
      if (typeSet.has(`${tagId}|${type}`)) continue;
      await db.insert(detransTagTypes).values({ tagId, type });
      typeSet.add(`${tagId}|${type}`);
    }
  }

  // 3. Rebuild detrans_user_tags for the feature-covered cohort.
  const coveredUsers = new Set<string>();
  for (const set of tagUsers.values()) for (const u of set) coveredUsers.add(u);
  const coveredList = [...coveredUsers];
  console.log(`  users covered: ${coveredList.length}`);

  for (let i = 0; i < coveredList.length; i += 500) {
    const batch = coveredList.slice(i, i + 500);
    await db
      .delete(detransUserTags)
      .where(inArray(detransUserTags.username, batch));
  }
  let inserted = 0;
  const userTagValues: { username: string; tagId: number }[] = [];
  for (const [tag, users] of tagUsers) {
    const tagId = tagIdByName.get(tag);
    if (!tagId) continue;
    for (const username of users) userTagValues.push({ username, tagId });
  }
  for (let i = 0; i < userTagValues.length; i += 1000) {
    const batch = userTagValues.slice(i, i + 1000);
    await db.insert(detransUserTags).values(batch).onConflictDoNothing();
    inserted += batch.length;
  }
  console.log(`  user_tags inserted: ${inserted}`);

  // 4. Update reason ids.
  for (const [username, entry] of reasons) {
    const update: Record<string, number> = {};
    if (entry.transition) {
      const id = tagIdByName.get(entry.transition);
      if (id) update.transitionReasonId = id;
    }
    if (entry.detransition) {
      const id = tagIdByName.get(entry.detransition);
      if (id) update.detransitionReasonId = id;
    }
    if (Object.keys(update).length > 0) {
      await db
        .update(detransUsers)
        .set(update)
        .where(eq(detransUsers.username, username));
    }
  }
  console.log(`  reason rows updated: ${reasons.size}`);

  // 5. Delete retired tags (no longer referenced).
  const deleted = await db
    .delete(detransTags)
    .where(notInArray(detransTags.name, [...canonical]))
    .returning({ id: detransTags.id });
  console.log(`  retired tags deleted: ${deleted.length}`);

  console.log("\nCommit complete.");
  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
