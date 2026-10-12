/**
 * Audit wiki pages against the wiki writing rules (app/lib/prompts.ts):
 * - attributed Reddit quotes must be verbatim (checked against
 *   detrans_comments / detrans_posts in Postgres and the "trans" Qdrant
 *   collection) and attributed to the right username
 * - /en/topics/... links must resolve to an existing page
 * - /studies/{id} links must point at an approved study
 * - no H1, a References block, no unscoped generalisations
 *
 *   npx tsx scripts/wiki-audit.ts                 # all pages, summary
 *   npx tsx scripts/wiki-audit.ts <path> [<path>] # specific pages, full detail
 *   npx tsx scripts/wiki-audit.ts --verbose       # all pages, full detail
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const GENERALISATION =
  /\b(most|the majority of|nearly all|almost all|typically|usually) (detransitioners|desisters|trans people|trans men|trans women|patients|young people|teenagers)\b/i;

interface Issue {
  kind: string;
  detail: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛']/g, "'")
    .replace(/[“”"]/g, '"')
    .replace(/[*_`>\\]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface QuoteBlock {
  quote: string;
  username: string;
  url: string;
  line: number;
}

/** Blockquote groups whose last line is a "—[user](reddit link)" attribution. */
function extractRedditQuotes(content: string): QuoteBlock[] {
  const lines = content.split("\n");
  const blocks: QuoteBlock[] = [];
  let buffer: string[] = [];
  let start = 0;
  const flush = () => {
    buffer = [];
  };
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line.startsWith(">")) {
      flush();
      return;
    }
    if (!buffer.length) start = index + 1;
    const body = line.replace(/^>\s?/, "");
    const attribution = body.match(
      /^[—–-]+\s*\[([^\]]+)\]\((https?:\/\/(?:www\.)?reddit\.com\/r\/[^)\s]+)\)/,
    );
    if (attribution) {
      const quote = buffer.join(" ").trim();
      if (quote) {
        blocks.push({
          quote,
          username: attribution[1].replace(/^u\//, "").replace(/\\(.)/g, "$1"),
          url: attribution[2],
          line: start,
        });
      }
      flush();
      return;
    }
    buffer.push(body);
  });
  return blocks;
}

function redditId(url: string): string | null {
  const segments = url.replace(/[?#].*$/, "").split("/").filter(Boolean);
  const commentsIdx = segments.indexOf("comments");
  if (commentsIdx === -1) return null;
  // /r/sub/comments/<postId>/<slug>/<commentId>  or  /r/sub/comments/<postId>/<slug>
  const tail = segments.slice(commentsIdx + 1);
  if (tail.length >= 3) return tail[2];
  return tail[0] ?? null;
}

async function main() {
  const argv = process.argv.slice(2);
  const verbose = argv.includes("--verbose") || argv.some((a) => !a.startsWith("--"));
  const only = argv.filter((a) => !a.startsWith("--"));

  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL!, { max: 4 });
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";

  const pages = await sql<
    { path: string; content: string; published: boolean; is_stub: boolean }[]
  >`select path, content, published, is_stub from pages order by path`;
  const pagePaths = new Set(pages.map((p) => p.path));
  const studyIds = new Set(
    (await sql<{ id: number }[]>`select id from studies where approved = true`).map(
      (r) => r.id,
    ),
  );

  const sourceCache = new Map<string, { text: string; username: string } | null>();
  async function lookupSource(id: string) {
    if (sourceCache.has(id)) return sourceCache.get(id)!;
    let found: { text: string; username: string } | null = null;
    const comment = await sql<{ text: string; username: string }[]>`
      select text, username from detrans_comments where id = ${id} limit 1`;
    if (comment[0]) found = comment[0];
    if (!found) {
      const post = await sql<{ text: string; username: string; title: string }[]>`
        select title, text, username from detrans_posts where id = ${id} limit 1`;
      if (post[0])
        found = { text: `${post[0].title}\n${post[0].text}`, username: post[0].username };
    }
    if (!found) {
      for (const collection of ["trans", "default_v2"]) {
        const res = await fetch(`${qdrantUrl}/collections/${collection}/points/scroll`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            limit: 1,
            with_payload: true,
            filter: { must: [{ key: "id", match: { value: id } }] },
          }),
        });
        const point = (await res.json())?.result?.points?.[0]?.payload;
        if (point) {
          let text = "";
          try {
            text = JSON.parse(point._node_content).text ?? "";
          } catch {}
          found = { text, username: point.username ?? "" };
          break;
        }
      }
    }
    sourceCache.set(id, found);
    return found;
  }

  let totalIssues = 0;
  let totalQuotes = 0;
  for (const page of pages) {
    if (only.length && !only.includes(page.path)) continue;
    const issues: Issue[] = [];
    const content = page.content;

    if (/^#\s/m.test(content)) issues.push({ kind: "h1", detail: "contains a '# ' H1" });
    if (!/<summary>.*References/i.test(content) && !page.is_stub)
      issues.push({ kind: "references", detail: "no References <details> block" });

    content.split("\n").forEach((line, i) => {
      const match = line.match(GENERALISATION);
      if (match && !/\(\[|\]\(\/studies|\]\(http/.test(line))
        issues.push({ kind: "generalisation", detail: `L${i + 1}: "${match[0]}" without a citation on the line` });
    });

    for (const m of content.matchAll(/\/en\/topics\/([a-z0-9\-/]+?)(?=[)"#\s?]|$)/g)) {
      const target = m[1].replace(/\/$/, "");
      if (!pagePaths.has(target)) issues.push({ kind: "dead-link", detail: `/en/topics/${target}` });
    }
    for (const m of content.matchAll(/\/studies\/(\d+)\b/g)) {
      if (!studyIds.has(Number(m[1])))
        issues.push({ kind: "bad-study", detail: `/studies/${m[1]} is not an approved study` });
    }

    const quotes = extractRedditQuotes(content);
    totalQuotes += quotes.length;
    for (const q of quotes) {
      const id = redditId(q.url);
      if (!id) {
        issues.push({ kind: "quote-link", detail: `L${q.line}: cannot parse id from ${q.url}` });
        continue;
      }
      const source = await lookupSource(id);
      if (!source) {
        issues.push({ kind: "quote-unknown", detail: `L${q.line}: ${id} not in corpus (${q.username})` });
        continue;
      }
      const deleted = source.username === "[deleted]" && /deleted/i.test(q.username);
      if (source.username && !deleted && source.username.toLowerCase() !== q.username.toLowerCase())
        issues.push({ kind: "quote-user", detail: `L${q.line}: attributed to ${q.username}, source author is ${source.username}` });
      const haystack = normalize(source.text);
      const fragments = q.quote
        .split(/…|\.\.\.|\[\.\.\.\]|\[…\]/)
        .map(normalize)
        .filter((f) => f.split(" ").length >= 4);
      const missing = fragments.filter((f) => !haystack.includes(f));
      if (!missing.length) continue;
      // Distinguish sentences stitched together without an ellipsis (every
      // sentence is real) from wording that is not in the source at all.
      const sentences = q.quote
        .split(/(?<=[.!?…])\s+|…|\.\.\./)
        .map(normalize)
        .filter((s) => s.split(" ").length >= 4);
      const absent = sentences.filter((s) => !haystack.includes(s));
      issues.push(
        absent.length
          ? {
              kind: "quote-mismatch",
              detail: `L${q.line} (${q.username}): ${absent.length}/${sentences.length} sentence(s) not in source → "${absent[0].slice(0, 90)}"`,
            }
          : {
              kind: "quote-stitched",
              detail: `L${q.line} (${q.username}): sentences are verbatim but joined without "…"`,
            },
      );
    }

    totalIssues += issues.length;
    const counts = issues.reduce<Record<string, number>>((acc, issue) => {
      acc[issue.kind] = (acc[issue.kind] ?? 0) + 1;
      return acc;
    }, {});
    const words = content.split(/\s+/).length;
    const summary = Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(" ");
    console.log(
      `${issues.length ? "✗" : "✓"} ${page.path} (${words}w, ${quotes.length} quotes${page.is_stub ? ", stub" : ""}${page.published ? "" : ", draft"}) ${summary}`,
    );
    if (verbose) for (const issue of issues) console.log(`    [${issue.kind}] ${issue.detail}`);
  }
  console.log(`\n${totalIssues} issue(s), ${totalQuotes} attributed quotes checked`);
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
