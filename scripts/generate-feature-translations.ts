#!/usr/bin/env tsx
/**
 * Generate translations for feature labels and choice options.
 *
 * Source of truth is the seeded detrans_features table (English labels plus
 * choice option keys). Translations are written into the next-intl message
 * files under:
 *
 *   statsPage.featureLabels.<featureKey>
 *   statsPage.optionLabels.<optionKey>
 *
 * The front end prefers those keys over the raw English DB label, so a
 * locale can be translated progressively.
 *
 * Usage:
 *   npx tsx scripts/generate-feature-translations.ts --locale es
 *   npx tsx scripts/generate-feature-translations.ts            # every locale
 *   npx tsx scripts/generate-feature-translations.ts --force --locale fr
 *
 * Options:
 *   --locale <code>  Only process one locale (repeatable / comma separated)
 *   --batch <n>      Strings per API call (default 60)
 *   --force          Re-translate keys that already exist
 */
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OpenAI } from "openai";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransFeatures } from "../db/schema";
import { localesInfo } from "../i18n/locales";

dotenv.config();

const MESSAGES_DIR = join(process.cwd(), "messages");
const MODEL = "deepseek/deepseek-chat-v3.1";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

function prettifyKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface Args {
  locales: string[];
  batch: number;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { locales: [], batch: 60, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--locale") {
      args.locales.push(
        ...(argv[++i] ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );
    } else if (arg === "--batch") {
      args.batch = Math.max(5, Number.parseInt(argv[++i] ?? "60", 10) || 60);
    } else if (arg === "--force") {
      args.force = true;
    }
  }
  return args;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateBatch(
  language: string,
  entries: Record<string, string>,
  attempt = 0,
): Promise<Record<string, string>> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You translate user-interface strings for a data dashboard about " +
            "detransition research. Translate JSON values from English into " +
            "the requested language. Keep the keys exactly as they are. Keep " +
            "translations concise (they label charts and filters) and avoid " +
            "adding explanations. Return ONLY a valid JSON object.",
        },
        {
          role: "user",
          content: `Language: ${language}\n\n${JSON.stringify(entries, null, 2)}`,
        },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) result[key] = value.trim();
    }
    return result;
  } catch (error) {
    if (attempt >= 4) throw error;
    const backoff = 1_000 * 2 ** attempt;
    console.warn(`  retrying in ${backoff}ms…`);
    await sleep(backoff);
    return translateBatch(language, entries, attempt + 1);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.OPENROUTER_KEY) {
    throw new Error("OPENROUTER_KEY is not set");
  }

  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/app";
  const client = postgres(connectionString, { max: 2 });
  const db = drizzle(client);

  const features = await db
    .select({
      key: detransFeatures.key,
      label: detransFeatures.label,
      question: detransFeatures.question,
      enabled: detransFeatures.enabled,
    })
    .from(detransFeatures);

  const featureEntries: Record<string, string> = {};
  const optionEntries: Record<string, string> = {};
  for (const feature of features) {
    if (!feature.enabled) continue;
    featureEntries[feature.key] = feature.label;
    const question = feature.question as {
      criteria?: Record<string, string | null> | string[];
    } | null;
    const criteria = question?.criteria;
    if (criteria && !Array.isArray(criteria)) {
      for (const optionKey of Object.keys(criteria)) {
        optionEntries[optionKey] = prettifyKey(optionKey);
      }
    }
  }

  const locales = (
    args.locales.length > 0 ? args.locales : localesInfo.map((info) => info.code)
  ).filter((code) => code !== "en");

  console.log(`Features: ${Object.keys(featureEntries).length}`);
  console.log(`Options:  ${Object.keys(optionEntries).length}`);
  console.log(`Locales:  ${locales.join(", ")}\n`);

  for (const locale of locales) {
    const info = localesInfo.find((entry) => entry.code === locale);
    if (!info) {
      console.warn(`Skipping unknown locale: ${locale}`);
      continue;
    }
    const filePath = join(MESSAGES_DIR, `${locale}.json`);
    const messages = JSON.parse(readFileSync(filePath, "utf8")) as Record<
      string,
      any
    >;
    const statsPage = (messages.statsPage ??= {});
    const featureLabels = (statsPage.featureLabels ??= {});
    const optionLabels = (statsPage.optionLabels ??= {});

    const missing: Record<string, string> = {};
    for (const [key, value] of Object.entries(featureEntries)) {
      if (args.force || !featureLabels[key]) missing[`f:${key}`] = value;
    }
    for (const [key, value] of Object.entries(optionEntries)) {
      if (args.force || !optionLabels[key]) missing[`o:${key}`] = value;
    }

    const pending = Object.entries(missing);
    if (pending.length === 0) {
      console.log(`${locale}: up to date`);
      continue;
    }

    console.log(`${locale}: translating ${pending.length} strings…`);
    for (let index = 0; index < pending.length; index += args.batch) {
      const batch = Object.fromEntries(
        pending.slice(index, index + args.batch),
      );
      const translated = await translateBatch(info.englishName, batch);
      for (const [prefixedKey, value] of Object.entries(translated)) {
        const key = prefixedKey.replace(/^[fo]:/, "");
        if (prefixedKey.startsWith("f:")) featureLabels[key] = value;
        else if (prefixedKey.startsWith("o:")) optionLabels[key] = value;
      }
      process.stdout.write(
        `  ${Math.min(index + args.batch, pending.length)}/${pending.length}\r`,
      );
      await sleep(250);
    }
    writeFileSync(filePath, JSON.stringify(messages, null, 2) + "\n");
    console.log(`\n${locale}: saved`);
  }

  await client.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
