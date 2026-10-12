/**
 * Rewrite internal wiki links that no longer resolve (pages moved under a new
 * parent, or links written without their parent segments) to the canonical
 * path of the unique page with the same final segment.
 *
 *   npx tsx scripts/wiki-fix-links.ts            # dry run
 *   npx tsx scripts/wiki-fix-links.ts --apply
 *
 * Links whose final segment matches no page, or several, are reported and
 * left alone. Only default-locale paths are rewritten.
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const LINK = /(?<=[("'\s=])(\/(?:[a-z]{2}(?:-[A-Za-z]+)?\/)?topics\/)([a-z0-9\-/]+?)(\/?)(?=[)"'#?\s<]|$)/g;

async function main() {
  const apply = process.argv.includes("--apply");
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL!, { max: 2 });

  const pages = await sql<{ id: number; path: string; slug: string; content: string }[]>`
    select id, path, slug, content from pages order by path`;
  const paths = new Set(pages.map((p) => p.path));
  const bySlug = new Map<string, string[]>();
  for (const page of pages) {
    bySlug.set(page.slug, [...(bySlug.get(page.slug) ?? []), page.path]);
  }

  const unresolved = new Map<string, string[]>();
  let total = 0;
  for (const page of pages) {
    let changed = 0;
    const content = page.content.replace(LINK, (match, prefix, target, slash) => {
      if (paths.has(target)) return match;
      const candidates = bySlug.get(target.split("/").pop()!) ?? [];
      if (candidates.length === 1) {
        changed++;
        return `${prefix}${candidates[0]}${slash}`;
      }
      unresolved.set(target, [...(unresolved.get(target) ?? []), page.path]);
      return match;
    });
    if (changed) {
      total += changed;
      console.log(`${page.path}: ${changed} link(s) rewritten`);
      if (apply) {
        await sql`update pages set content = ${content}, updated_at = now() where id = ${page.id}`;
      }
    }
  }

  console.log(`\n${total} link(s) ${apply ? "rewritten" : "would be rewritten"}`);
  for (const [target, sources] of unresolved) {
    console.log(`unresolved: /topics/${target}  (in ${[...new Set(sources)].join(", ")})`);
  }
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
