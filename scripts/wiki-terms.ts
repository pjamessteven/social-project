/**
 * Find terms used before they are introduced on wiki pages:
 * - "late definition": a term is introduced (bolded **Term**, or "Full Name (ACRONYM)")
 *   on line N but already appears in body text on an earlier line
 * - "unexpanded acronym": an acronym's first body use has no expansion
 *   ("Full Name (ACR)" or "ACR (full name)") anywhere on the page
 *
 *   npx tsx scripts/wiki-terms.ts [<path> ...]
 *
 * Headings, quotes, tables of references and link URLs are ignored as "uses".
 * Output is a list of candidates for human review, not a strict lint.
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Common acronyms readers can be assumed to know, or that are explained by
// the site chrome. Extend as needed.
const KNOWN = new Set([
  "UK", "US", "USA", "EU", "UN", "NHS", "OK", "TV", "BBC", "NYT", "PDF", "DOI",
  "FAQ", "ID", "IQ", "AI", "LGB", "LGBT", "LGBTQ", "MD", "PhD", "MP", "HTML",
  "FTM", "MTF", "TV", "COVID", "HIV", "ADHD", "OCD", "PTSD", "DIY", "CEO",
  "DSM", "ICD", "WHO", "FDA", "NY", "CA", "TX", "NZ", "UKSC", "EWCA", "EWHC",
]);

function stripNoise(line: string): string {
  return line
    .replace(/\]\([^)]*\)/g, "]") // markdown link targets
    .replace(/href="[^"]*"/g, "")
    .replace(/<[^>]+>/g, " ");
}

function isBodyLine(line: string): boolean {
  const t = line.trim();
  return !!t && !t.startsWith("#") && !t.startsWith(">") && !t.startsWith("<li>");
}

async function main() {
  const only = process.argv.slice(2);
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL!, { max: 2 });
  const pages = await sql<{ path: string; content: string }[]>`
    select path, content from pages order by path`;

  let total = 0;
  for (const page of pages) {
    if (only.length && !only.includes(page.path)) continue;
    // Stop at the References block
    const body = page.content.split(/<summary><i>References/i)[0];
    const lines = body.split("\n");
    const findings: string[] = [];

    const firstUse = (term: string): number => {
      const re = new RegExp(`(^|[^\\w])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\w]|$)`, "i");
      return lines.findIndex((l) => isBodyLine(l) && re.test(stripNoise(l)));
    };

    // 1. Late definitions
    const seen = new Set<string>();
    lines.forEach((line, i) => {
      if (!isBodyLine(line)) return;
      const clean = stripNoise(line);
      const defs = [
        ...[...line.matchAll(/\*\*([^*]{3,60}?)\*\*(?=\s*(?:\(|:|—|-|is |are |means |refers ))/g)].map((m) => m[1]),
        ...[...clean.matchAll(/([A-Z][\w'-]+(?:\s+[A-Za-z][\w'-]+){1,8})\s+\(([A-Z][A-Za-z0-9]{1,8})\)/g)].map((m) => m[2]),
      ];
      for (const term of defs) {
        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const first = firstUse(term);
        if (first !== -1 && first < i) {
          findings.push(`late-definition "${term}": used L${first + 1}, introduced L${i + 1}`);
        }
      }
    });

    // 2. Acronyms never expanded
    const acronyms = new Set<string>();
    for (const line of lines) {
      if (!isBodyLine(line)) continue;
      for (const m of stripNoise(line).matchAll(/\b([A-Z][A-Z0-9]{1,7}s?)\b/g)) {
        const a = m[1].replace(/s$/, "");
        if (a.length >= 2 && !KNOWN.has(a) && !/^\d/.test(a)) acronyms.add(a);
      }
    }
    for (const a of acronyms) {
      const expanded =
        new RegExp(`\\(${a}\\)`).test(body) ||
        new RegExp(`\\b${a}\\b\\s*\\((?!\\d)[^)]{6,}\\)`).test(body) ||
        new RegExp(`\\*\\*${a}\\*\\*`).test(body);
      if (!expanded) {
        const first = firstUse(a);
        if (first !== -1) findings.push(`unexpanded-acronym "${a}": first used L${first + 1}`);
      }
    }

    if (findings.length) {
      total += findings.length;
      console.log(`\n${page.path}`);
      for (const f of findings) console.log(`  ${f}`);
    }
  }
  console.log(`\n${total} candidate(s)`);
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
