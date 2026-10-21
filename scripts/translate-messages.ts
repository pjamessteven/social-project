#!/usr/bin/env tsx
/**
 * Translate next-intl message keys from messages/en.json into every other
 * locale file, via OpenRouter.
 *
 *   npx tsx scripts/translate-messages.ts studiesPage.debunk chat.eventLabels.readStudies
 *   npx tsx scripts/translate-messages.ts --missing                 # every key a locale lacks
 *   npx tsx scripts/translate-messages.ts --force --locale fr,de studiesPage.debunk
 *   npx tsx scripts/translate-messages.ts --dry-run studiesPage.debunk
 *
 * A key may name a leaf ("chat.readingStudies") or an object ("studiesPage.debunk",
 * meaning every leaf under it). Keys a locale already has are kept unless
 * --force. New keys are inserted at the same position as in en.json, so the
 * files stay in the same order. ICU placeholders ({comment}) and rich-text
 * tags (<b>…</b>) must survive translation; a value that loses one is retried
 * once and then left untranslated with a warning (it falls back to English at
 * runtime).
 *
 * Options:
 *   --locale <codes>  Only these locales (comma separated, repeatable)
 *   --missing         Select every leaf key absent from a locale
 *   --force           Re-translate keys the locale already has
 *   --batch <n>       Strings per API call (default 40)
 *   --concurrency <n> Locales translated at once (default 4)
 *   --dry-run         Print what would be translated, write nothing
 */
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OpenAI } from "openai";
import { localesInfo } from "../i18n/locales";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MESSAGES_DIR = join(process.cwd(), "messages");
const MODEL = "deepseek/deepseek-chat-v3.1";

type Messages = { [key: string]: string | Messages };

interface Args {
  keys: string[];
  locales: string[];
  missing: boolean;
  force: boolean;
  batch: number;
  concurrency: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    keys: [],
    locales: [],
    missing: false,
    force: false,
    batch: 40,
    concurrency: 4,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--locale") {
      args.locales.push(
        ...(argv[++i] ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      );
    } else if (arg === "--missing") args.missing = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--batch")
      args.batch = Math.max(1, Number.parseInt(argv[++i] ?? "40", 10) || 40);
    else if (arg === "--concurrency")
      args.concurrency = Math.max(
        1,
        Number.parseInt(argv[++i] ?? "4", 10) || 4,
      );
    else if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
    else args.keys.push(arg);
  }
  return args;
}

// --- message tree helpers --------------------------------------------------

function readMessages(locale: string): Messages {
  return JSON.parse(
    readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf8"),
  ) as Messages;
}

function writeMessages(locale: string, messages: Messages) {
  writeFileSync(
    join(MESSAGES_DIR, `${locale}.json`),
    JSON.stringify(messages, null, 2) + "\n",
  );
}

/** Every string leaf as "a.b.c" → value, in file order. */
function flatten(node: Messages, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [p, v] of flatten(value, path)) out.set(p, v);
  }
  return out;
}

function getPath(node: Messages, path: string): string | Messages | undefined {
  let current: string | Messages | undefined = node;
  for (const segment of path.split(".")) {
    if (!current || typeof current === "string") return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Set `path` in `target`, creating objects as needed and inserting each new
 * key where en.json has it: right after the nearest preceding English
 * sibling that the target already contains (or first).
 */
function setInOrder(
  target: Messages,
  reference: Messages,
  path: string,
  value: string,
) {
  const segments = path.split(".");
  let node = target;
  let ref: Messages | undefined = reference;
  for (let i = 0; i < segments.length; i++) {
    const key = segments[i];
    const last = i === segments.length - 1;
    const refSiblings = ref ? Object.keys(ref) : [];
    const refChild: string | Messages | undefined = ref?.[key];
    if (!(key in node) || (last ? false : typeof node[key] === "string")) {
      const newValue: string | Messages = last ? value : {};
      // Rebuild `node` with the key in English order
      const before = refSiblings.slice(0, refSiblings.indexOf(key));
      const anchor = [...before].reverse().find((k) => k in node);
      const rebuilt: Messages = {};
      let inserted = false;
      if (!anchor) {
        rebuilt[key] = newValue;
        inserted = true;
      }
      for (const [k, v] of Object.entries(node)) {
        if (k === key) continue;
        rebuilt[k] = v;
        if (k === anchor) {
          rebuilt[key] = newValue;
          inserted = true;
        }
      }
      if (!inserted) rebuilt[key] = newValue;
      for (const k of Object.keys(node)) delete node[k];
      Object.assign(node, rebuilt);
    } else if (last) {
      node[key] = value;
    }
    if (!last) {
      node = node[key] as Messages;
      ref = refChild && typeof refChild !== "string" ? refChild : undefined;
    }
  }
}

// --- translation -----------------------------------------------------------

const PLACEHOLDER_RE = /\{[^{}]+\}/g;
const TAG_RE = /<\/?[a-zA-Z][\w-]*>/g;

function tokens(value: string): string {
  return [
    ...(value.match(PLACEHOLDER_RE) ?? []),
    ...(value.match(TAG_RE) ?? []),
  ]
    .sort()
    .join(" ");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

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
            "You translate user-interface strings for detrans.ai, a website " +
            "about detransition (people who stopped or reversed a gender " +
            "transition). It has a chat assistant grounded in detransitioners' " +
            "experiences, an archive of academic studies, videos and a wiki. " +
            `Translate the JSON values from English into ${language}. Keep the ` +
            "keys exactly as they are. Write natural, concise UI text in the " +
            "register of a modern website, not a word-for-word rendering. " +
            "Preserve ICU placeholders such as {comment} or {count} verbatim, " +
            "keep HTML-like tags such as <b>…</b> around the same words, keep " +
            "line breaks (\\n) and quotation marks where they are. Some values " +
            "are instructions addressed to an AI assistant (they usually begin " +
            "with 'Please'): translate them as instructions in the target " +
            "language. Return ONLY a valid JSON object.",
        },
        { role: "user", content: JSON.stringify(entries, null, 2) },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "";
    const cleaned = raw
      .replace(/^```(?:json)?/m, "")
      .replace(/```$/m, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) result[key] = value;
    }
    return result;
  } catch (error) {
    if (attempt >= 4) throw error;
    const backoff = 1_000 * 2 ** attempt;
    console.warn(`  ${language}: retrying in ${backoff}ms…`);
    await sleep(backoff);
    return translateBatch(language, entries, attempt + 1);
  }
}

/** Translate `entries` for one language, re-asking once for values that lost a placeholder or tag. */
async function translateChecked(
  language: string,
  entries: Record<string, string>,
  batch: number,
): Promise<{ ok: Record<string, string>; failed: string[] }> {
  const ok: Record<string, string> = {};
  let pending = { ...entries };
  for (let round = 0; round < 2 && Object.keys(pending).length > 0; round++) {
    const keys = Object.keys(pending);
    const next: Record<string, string> = {};
    for (let i = 0; i < keys.length; i += batch) {
      const slice = Object.fromEntries(
        keys.slice(i, i + batch).map((k) => [k, pending[k]]),
      );
      const translated = await translateBatch(language, slice);
      for (const [key, source] of Object.entries(slice)) {
        const value = translated[key];
        if (value && tokens(value) === tokens(source)) ok[key] = value;
        else next[key] = source;
      }
    }
    pending = next;
  }
  return { ok, failed: Object.keys(pending) };
}

// --- main ------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dryRun && !process.env.OPENROUTER_KEY) {
    throw new Error("OPENROUTER_KEY is not set");
  }
  if (args.keys.length === 0 && !args.missing) {
    throw new Error("Give one or more keys, or --missing");
  }

  const english = readMessages("en");
  const englishLeaves = flatten(english);
  const selected = new Map<string, string>();
  for (const [path, value] of englishLeaves) {
    const wanted =
      args.missing ||
      args.keys.some((k) => path === k || path.startsWith(`${k}.`));
    if (wanted) selected.set(path, value);
  }
  for (const key of args.keys) {
    if (![...selected.keys()].some((p) => p === key || p.startsWith(`${key}.`)))
      console.warn(`No English string under "${key}"`);
  }
  if (selected.size === 0) {
    console.log("nothing selected");
    return;
  }

  const targets = localesInfo.filter(
    (l) =>
      l.code !== "en" &&
      (args.locales.length === 0 || args.locales.includes(l.code)),
  );

  let translated = 0;
  const failures: string[] = [];
  const work = [...targets];
  const workers = Array.from(
    { length: Math.min(args.concurrency, work.length) },
    async () => {
      for (;;) {
        const locale = work.shift();
        if (!locale) return;
        const messages = readMessages(locale.code);
        const todo: Record<string, string> = {};
        for (const [path, value] of selected) {
          if (args.force || getPath(messages, path) === undefined)
            todo[path] = value;
        }
        const count = Object.keys(todo).length;
        if (count === 0) {
          console.log(`${locale.code}: up to date`);
          continue;
        }
        if (args.dryRun) {
          console.log(`${locale.code}: would translate ${count}:`);
          for (const path of Object.keys(todo)) console.log(`  ${path}`);
          continue;
        }
        const { ok, failed } = await translateChecked(
          locale.englishName,
          todo,
          args.batch,
        );
        for (const [path, value] of Object.entries(ok))
          setInOrder(messages, english, path, value);
        writeMessages(locale.code, messages);
        translated += Object.keys(ok).length;
        for (const path of failed) failures.push(`${locale.code}: ${path}`);
        console.log(
          `${locale.code}: translated ${Object.keys(ok).length}/${count}` +
            (failed.length ? ` (kept English for ${failed.join(", ")})` : ""),
        );
      }
    },
  );
  await Promise.all(workers);

  console.log(`\n${translated} strings written`);
  if (failures.length) {
    console.warn(
      `${failures.length} left untranslated (placeholder or tag lost):\n  ${failures.join("\n  ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
