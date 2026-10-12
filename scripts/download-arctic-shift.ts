#!/usr/bin/env tsx
/**
 * Download posts or comments for a subreddit/user from the Arctic Shift API.
 *
 * Replicates the pagination logic of the official web download tool
 * (https://arctic-shift.photon-reddit.com/download-tool, repo ArthurHeitmann/arctic_shift_ui):
 *
 *   - GET /api/{posts|comments}/search?{subreddit|author}=<name>&limit=auto&sort=asc&after=<cursor>
 *   - cursor starts at `--after` (default 0 = full history) and advances to the
 *     last seen `created_utc` + 1s, so rows are neither duplicated nor skipped
 *     regardless of the API's inclusive/exclusive `after` semantics.
 *   - loops until the API returns an empty page.
 *   - every row is written as one JSON object per line (JSONL) and can be fed
 *     directly into scripts/ingest-reddit-jsonl.ts.
 *
 * Retries with exponential backoff on 429 rate limits, 5xx errors, timeouts and
 * "slow down" replies. Ctrl-C flushes the file; continue later with --resume.
 *
 * Usage:
 *   npx tsx scripts/download-arctic-shift.ts --type comments --subreddit detrans \
 *     --after 2026-05-15T03:35:31Z --out /home/peter/development/r_detrans_comments.jsonl
 *
 * Options:
 *   --type comments|posts   required
 *   --subreddit <name>      download a subreddit (or use --author)
 *   --author <name>         download a user
 *   --after <date>          start boundary, ISO 8601 or epoch s/ms (default: 0)
 *   --before <date>         end boundary, ISO 8601 or epoch s/ms (default: none)
 *   --out <path>            output JSONL path (required)
 *   --resume                append to --out, continuing after its last row
 *   --max-retries <n>       retries per request; 0 = unlimited (default 100)
 *   --page-delay <ms>       pause between pages (default 150)
 *   --meta-app <label>      API meta-app label (default download-tool)
 *   --help                  show this help
 */
import fs from "node:fs";
import { createWriteStream, type WriteStream } from "node:fs";
import readline from "node:readline";

const API_BASE = "https://arctic-shift.photon-reddit.com";

type Kind = "comments" | "posts";

interface Options {
  kind: Kind;
  subreddit: string | null;
  author: string | null;
  after: number;
  before: number | null;
  out: string;
  resume: boolean;
  maxRetries: number;
  pageDelay: number;
  metaApp: string;
}

const USAGE = `Usage: npx tsx scripts/download-arctic-shift.ts --type comments|posts --subreddit <name>|--author <name> --out <file> [options]

Options:
  --after <date>        start boundary, ISO 8601 or epoch s/ms (default: 0)
  --before <date>       end boundary, ISO 8601 or epoch s/ms (default: none)
  --resume              append to --out, continuing after its last row
  --max-retries <n>     retries per request; 0 = unlimited (default: 100)
  --page-delay <ms>     pause between pages (default: 150)
  --meta-app <label>    API meta-app label (default: download-tool)
  --help                show this help`;

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseDate(value: string, flag: string): number {
  if (/^\d+$/.test(value)) {
    const n = Number(value);
    return n >= 1e12 ? n : n * 1000; // epoch seconds vs milliseconds
  }
  const t = Date.parse(value);
  if (!Number.isFinite(t)) throw new Error(`${flag}: cannot parse date "${value}"`);
  return t;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    kind: "comments",
    subreddit: null,
    author: null,
    after: 0,
    before: null,
    out: "",
    resume: false,
    maxRetries: 100,
    pageDelay: 150,
    metaApp: "download-tool",
  };
  let kindSet = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--type": {
        const v = argv[++i];
        if (v !== "comments" && v !== "posts") throw new Error(`--type must be "comments" or "posts", got "${v}"`);
        opts.kind = v;
        kindSet = true;
        break;
      }
      case "--subreddit":
        opts.subreddit = argv[++i] ?? null;
        break;
      case "--author":
        opts.author = argv[++i] ?? null;
        break;
      case "--after":
        opts.after = parseDate(argv[++i] ?? "", "--after");
        break;
      case "--before":
        opts.before = parseDate(argv[++i] ?? "", "--before");
        break;
      case "--out":
        opts.out = argv[++i] ?? "";
        break;
      case "--resume":
        opts.resume = true;
        break;
      case "--max-retries": {
        const v = parseInt(argv[++i] ?? "", 10);
        if (!Number.isFinite(v) || v < 0) throw new Error("--max-retries requires a non-negative integer");
        opts.maxRetries = v;
        break;
      }
      case "--page-delay": {
        const v = parseInt(argv[++i] ?? "", 10);
        if (!Number.isFinite(v) || v < 0) throw new Error("--page-delay requires a non-negative integer");
        opts.pageDelay = v;
        break;
      }
      case "--meta-app":
        opts.metaApp = argv[++i] ?? "download-tool";
        break;
      case "--help":
      case "-h":
        console.log(USAGE);
        process.exit(0);
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!kindSet) throw new Error("--type is required (comments|posts)");
  if (opts.subreddit && opts.author) throw new Error("pass either --subreddit or --author, not both");
  if (!opts.subreddit && !opts.author) throw new Error("--subreddit or --author is required");
  if (!opts.out) throw new Error("--out is required");
  if (opts.before !== null && opts.before <= opts.after) throw new Error("--before must be after --after");
  return opts;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const fmtIso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const fmtNum = (n: number) => n.toLocaleString("en-US");
const fmtBytes = (n: number) =>
  n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${(n / 1e3).toFixed(1)} kB`;

function buildUrl(opts: Options, cursor: number): string {
  const filter = opts.subreddit
    ? `subreddit=${encodeURIComponent(opts.subreddit.replace(/^r\//, ""))}`
    : `author=${encodeURIComponent((opts.author ?? "").replace(/^u\//, ""))}`;
  const params = [
    filter,
    "limit=auto",
    "sort=asc",
    `after=${cursor}`,
    ...(opts.before !== null ? [`before=${opts.before}`] : []),
    `meta-app=${encodeURIComponent(opts.metaApp)}`,
  ];
  return `${API_BASE}/api/${opts.kind}/search?${params.join("&")}`;
}

function writeAsync(stream: WriteStream, chunk: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.write(chunk, (err) => (err ? reject(err) : resolve()));
  });
}

async function tailLastCreatedUtc(file: string): Promise<number | null> {
  const fh = await fs.promises.open(file, "r");
  try {
    const size = (await fh.stat()).size;
    if (size === 0) return null;
    const chunk = Math.min(size, 4 * 1024 * 1024);
    const buf = Buffer.alloc(chunk);
    await fh.read(buf, 0, chunk, size - chunk);
    const lines = buf.toString("utf8").split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = (lines[i] ?? "").trim();
      // Skip the trailing empty string and a possibly truncated first line.
      if (!line || (i === 0 && size > chunk)) continue;
      try {
        const obj = JSON.parse(line) as { created_utc?: unknown };
        if (typeof obj.created_utc === "number") return obj.created_utc;
      } catch {
        // keep scanning upwards
      }
    }
    return null;
  } finally {
    await fh.close();
  }
}

async function countLines(file: string): Promise<number> {
  let count = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) count++;
  return count;
}

function rateLimitWaitMs(res: Response): number {
  const at = res.headers.get("x-ratelimit-reset-at");
  if (at) {
    const n = Number(at);
    if (Number.isFinite(n) && n > 0) {
      const ms = n > 1e12 ? n : n * 1000;
      return Math.max(0, ms - Date.now()) + 1000 + Math.random() * 1000;
    }
  }
  const reset = res.headers.get("x-ratelimit-reset");
  if (reset) {
    const n = Number(reset);
    if (Number.isFinite(n) && n > 0) return n * 1000 + 1000 + Math.random() * 1000;
  }
  return 30_000 + Math.random() * 5_000;
}

function backoffMs(attempt: number): number {
  return Math.min(3_000 * Math.pow(1.6, attempt - 1), 120_000) + Math.random() * 1_000;
}

function canRetry(opts: Options, attempt: number): boolean {
  return opts.maxRetries === 0 || attempt <= opts.maxRetries;
}

async function fetchPage(opts: Options, cursor: number): Promise<any[]> {
  const url = buildUrl(opts, cursor);
  let attempt = 0;
  for (;;) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(180_000),
        headers: { "user-agent": "arctic-shift-downloader/1.0 (replicates official download-tool)" },
      });

      if (res.status === 429) {
        const wait = rateLimitWaitMs(res);
        attempt++;
        if (!canRetry(opts, attempt)) throw new Error("rate limited and retries exhausted");
        console.warn(`  [429 rate limited] waiting ${(wait / 1000).toFixed(0)}s (retry ${attempt}) ...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`invalid JSON response: ${text.slice(0, 120)}`);
      }
      if (json?.error) throw new Error(`API: ${json.error}`);
      if (!json || !Array.isArray(json.data)) throw new Error("API response has no data array");
      return json.data;
    } catch (err) {
      attempt++;
      if (!canRetry(opts, attempt)) throw err;
      const delay = backoffMs(attempt);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  [${msg.slice(0, 100)}] retry ${attempt}/${opts.maxRetries || "∞"} in ${(delay / 1000).toFixed(1)}s ...`);
      await sleep(delay);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const target = opts.subreddit ? `r/${opts.subreddit}` : `u/${opts.author}`;

  let cursor = opts.after;
  let count = 0;
  let writtenBytes = 0;

  if (opts.resume && fs.existsSync(opts.out)) {
    const lastTs = await tailLastCreatedUtc(opts.out);
    count = await countLines(opts.out);
    writtenBytes = fs.statSync(opts.out).size;
    if (lastTs !== null && lastTs * 1000 + 1000 > cursor) cursor = lastTs * 1000 + 1000;
    console.log(`Resuming: ${fmtNum(count)} existing rows in ${opts.out}`);
  } else if (!opts.resume && fs.existsSync(opts.out)) {
    console.log(`Overwriting existing file ${opts.out}`);
  }

  console.log("=== Arctic Shift download ===");
  console.log(`Target:     ${target}`);
  console.log(`Type:       ${opts.kind}`);
  console.log(`Range:      ${fmtIso(cursor)} → ${opts.before !== null ? fmtIso(opts.before) : "now"}`);
  console.log(`Output:     ${opts.out}`);
  console.log();

  const stream = createWriteStream(opts.out, { flags: opts.resume ? "a" : "w" });
  let interrupted = false;
  const onSignal = () => {
    interrupted = true;
    console.log("\nInterrupted — flushing file ...");
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  const seen = new Set<string>();
  const started = Date.now();
  let pages = 0;
  let lastRowId: string | null = null;

  try {
    for (;;) {
      if (interrupted) break;
      const data = await fetchPage(opts, cursor);
      if (data.length === 0) {
        console.log(`No more rows after ${fmtIso(cursor)} — done.`);
        break;
      }
      pages++;

      let buf = "";
      let added = 0;
      let maxTs = cursor;
      for (const row of data) {
        const id = row?.id != null ? String(row.id) : "";
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        buf += `${JSON.stringify(row)}\n`;
        added++;
        lastRowId = id || lastRowId;
        if (typeof row?.created_utc === "number") maxTs = Math.max(maxTs, row.created_utc * 1000);
      }
      if (buf) {
        await writeAsync(stream, buf);
        writtenBytes += Buffer.byteLength(buf);
      }
      count += added;

      // Advance past the newest row (next full second) so we never refetch it.
      const next = maxTs + 1000;
      cursor = next > cursor ? next : cursor + 1000;

      const elapsed = (Date.now() - started) / 1000;
      const rate = elapsed > 0 ? Math.round(count / elapsed) : 0;
      console.log(
        `  page ${pages.toLocaleString()} | +${fmtNum(added)} rows (total ${fmtNum(count)}) | ` +
          `through ${fmtIso(cursor - 1000)} | ${rate} rows/s | ${fmtBytes(writtenBytes)}`,
      );

      if (opts.pageDelay) await sleep(opts.pageDelay);
    }
  } finally {
    await new Promise<void>((resolve) => stream.end(() => resolve()));
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }

  const elapsed = (Date.now() - started) / 1000;
  console.log();
  console.log(`=== ${interrupted ? "Stopped" : "Done"} ===`);
  console.log(`Rows:    ${fmtNum(count)}`);
  console.log(`File:    ${opts.out} (${fmtBytes(writtenBytes)})`);
  console.log(`Last id: ${lastRowId ?? "-"}`);
  console.log(`Time:    ${elapsed.toFixed(1)}s`);
  if (interrupted) {
    console.log(`\nResume with the same command plus --resume`);
    process.exitCode = 130;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
