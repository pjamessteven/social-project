/**
 * CLI adapter for the wiki agent's tools — runs the exact tool objects the
 * in-app agent uses (app/lib/agents/tools.ts) against the configured DB,
 * Qdrant and Redis, so wiki work can be done from a terminal / coding agent.
 *
 *   npx tsx scripts/wiki-tools.ts <tool> '<json args>'
 *   npx tsx scripts/wiki-tools.ts <tool> --args-file args.json
 *   npx tsx scripts/wiki-tools.ts createPage --args-file meta.json --content-file page.md
 *   npx tsx scripts/wiki-tools.ts tags            # list study tag names
 *   (query* tools print readable blocks; add --raw for the agent JSON)
 *   npx tsx scripts/wiki-tools.ts help
 *
 * Tools: queryComments (detrans perspectives), queryTransComments (trans
 * perspectives), queryStories, queryVideos, queryStudies, getStudies,
 * webSearch, listPages, createPage, updatePage, grep, cat, sed, patch.
 * deletePage is deliberately not exposed.
 */
import * as dotenv from "dotenv";
import { readFileSync } from "node:fs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ADMIN = process.env.WIKI_CLI_ADMIN || "wiki-cli";

async function main() {
  const [name, ...rest] = process.argv.slice(2);
  if (!name || name === "help" || name === "--help") {
    console.log(readFileSync(__filename, "utf8").split("*/")[0]);
    return;
  }

  let args: Record<string, unknown> = {};
  let raw = false;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--raw") {
      raw = true;
    } else if (arg === "--args-file") {
      args = { ...args, ...JSON.parse(readFileSync(rest[++i], "utf8")) };
    } else if (arg === "--content-file") {
      args.content = readFileSync(rest[++i], "utf8");
    } else if (arg === "--patch-file") {
      args.patch = readFileSync(rest[++i], "utf8");
    } else if (arg.trim().startsWith("{")) {
      args = { ...args, ...JSON.parse(arg) };
    } else {
      throw new Error(`Unrecognised argument: ${arg}`);
    }
  }

  const { initSettings } = await import("../app/lib/agents/settings");
  const { RedisCache } = await import("../app/lib/agents/cache");
  const data = await import("../app/lib/agents/data");
  const t = await import("../app/lib/agents/tools");
  initSettings();

  if (name === "tags") {
    const { db } = await import("../db");
    const { studyTags } = await import("../db/schema");
    const rows = await db.select({ name: studyTags.name }).from(studyTags);
    console.log(rows.map((r) => r.name).filter(Boolean).sort().join("\n"));
    return;
  }

  const cache = new RedisCache("detrans_chat");
  const admin = { adminUsername: ADMIN };
  const factories: Record<string, () => Promise<any>> = {
    queryComments: async () => t.createQueryCommentsTool({ cache }),
    queryTransComments: async () =>
      t.createQueryTransCommentsTool({
        cache,
        index: await data.getTransCommentsIndex(),
      }),
    queryStories: async () =>
      t.createQueryStoriesTool({ cache, index: await data.getStoriesIndex() }),
    queryVideos: async () =>
      t.createQueryVideosTool({ cache, index: await data.getVideosIndex() }),
    queryStudies: async () =>
      t.createQueryStudiesTool({ cache, index: await data.getStudiesIndex() }),
    getStudies: async () => t.createGetStudiesTool(),
    webSearch: async () => t.createWebSearchTool({ cache }),
    listPages: async () => t.createListPagesTool(admin),
    createPage: async () => t.createCreatePageTool(admin),
    updatePage: async () => t.createUpdatePageTool(admin),
    grep: async () => t.createGrepTool(admin),
    cat: async () => t.createCatTool(admin),
    sed: async () => t.createSedTool(admin),
    patch: async () => t.createPatchTool(admin),
  };

  const factory = factories[name];
  if (!factory) {
    throw new Error(
      `Unknown tool "${name}". Available: ${Object.keys(factories).join(", ")}, tags`,
    );
  }
  const result = await (await factory()).call(args);
  const output = typeof result === "string" ? result : JSON.stringify(result);
  // Wait for stdout to drain: process.exit() below would otherwise truncate
  // large outputs (e.g. cat of a long page) when piped.
  await new Promise<void>((resolve) =>
    process.stdout.write(`${raw ? output : formatResult(name, output)}\n`, () =>
      resolve(),
    ),
  );
}

/**
 * Readable output for the retrieval tools: one block per comment/transcript
 * with the attribution fields a wiki citation needs. Pass --raw for the JSON
 * the agent sees.
 */
function formatResult(name: string, output: string): string {
  if (!["queryComments", "queryTransComments", "queryStories", "queryVideos"].includes(name)) {
    return output;
  }
  let items: any[];
  try {
    items = JSON.parse(output);
  } catch {
    return output;
  }
  if (!Array.isArray(items)) return output;
  return items
    .map((item, i) => {
      const text = item.node?.text ?? item.text ?? "";
      const meta = item.node?.metadata ?? item.metadata ?? {};
      const link = meta.link
        ? String(meta.link).startsWith("http")
          ? meta.link
          : `https://reddit.com${meta.link}`
        : (meta.url ?? "");
      const who = [meta.username ?? meta.author, meta.userFlair ?? meta.sex]
        .filter(Boolean)
        .join(" | ");
      const extra = meta.title ? `title: ${meta.title}\n` : "";
      return `### [${i + 1}] ${who} (upvotes ${meta.score ?? "?"})\nlink: ${link}\n${extra}${text.trim()}`;
    })
    .join("\n\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
