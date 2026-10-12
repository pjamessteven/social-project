#!/usr/bin/env tsx
/**
 * Seed/refresh detrans_features from app/lib/feature-taxonomy.ts.
 *
 * Upserts by `key`: safe to re-run whenever the taxonomy changes. Existing
 * detrans_user_features rows keep their feature_id; answer values are
 * re-derived from stored probabilities at sync time, so threshold changes do
 * not require re-calling Jev.
 *
 * Usage: npx tsx scripts/seed-features.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { TAXONOMY_VERSION, featureTaxonomy } from "../app/lib/feature-taxonomy";
import { detransFeatures } from "../db/schema";

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: 2 });
  const db = drizzle(client);

  console.log("=== Seeding feature taxonomy ===");
  console.log(`Taxonomy version: ${TAXONOMY_VERSION}`);
  console.log(`Features:         ${featureTaxonomy.length}`);

  const keys = featureTaxonomy.map((f) => f.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error("Duplicate feature keys in taxonomy");
  }

  let count = 0;
  for (const feature of featureTaxonomy) {
    await db
      .insert(detransFeatures)
      .values({
        key: feature.key,
        label: feature.label,
        group: feature.group,
        tier: feature.tier,
        kind: feature.question.type,
        question: feature.question,
        tagName: feature.tag ?? null,
        tagType: feature.tagType ?? null,
        threshold: feature.threshold ?? null,
        choiceTagMap: feature.choiceTagMap ?? null,
        choiceTagThreshold: feature.choiceTagThreshold ?? null,
        version: TAXONOMY_VERSION,
        enabled: true,
      })
      .onConflictDoUpdate({
        target: detransFeatures.key,
        set: {
          label: sql`excluded.label`,
          group: sql`excluded."group"`,
          tier: sql`excluded.tier`,
          kind: sql`excluded.kind`,
          question: sql`excluded.question`,
          tagName: sql`excluded.tag_name`,
          tagType: sql`excluded.tag_type`,
          threshold: sql`excluded.threshold`,
          choiceTagMap: sql`excluded.choice_tag_map`,
          choiceTagThreshold: sql`excluded.choice_tag_threshold`,
          version: sql`excluded.version`,
          updatedAt: sql`now()`,
        },
      });
    count++;
  }

  const byKind = featureTaxonomy.reduce(
    (acc, f) => {
      acc[f.question.type] = (acc[f.question.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const byTier = featureTaxonomy.reduce(
    (acc, f) => {
      acc[f.tier] = (acc[f.tier] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const tagged = featureTaxonomy.filter((f) => f.tag || f.choiceTagMap).length;

  console.log(`Upserted: ${count}`);
  console.log(`By kind:  ${JSON.stringify(byKind)}`);
  console.log(`By tier:  ${JSON.stringify(byTier)}`);
  console.log(`Tag-producing features: ${tagged}`);

  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
