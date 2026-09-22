import { banIp, isIpBanned } from "@/app/lib/ipBan";
import {
  createPage,
  deletePage,
  listPagesTree,
  updatePage,
} from "@/app/lib/pages";
import { db } from "@/db";
import { studies, studyTagRelations, studyTags } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { Settings, tool, type VectorStoreIndex } from "llamaindex";
import z from "zod";
import { type Cache, makeHashedKey } from "./cache";
import { queryCommentsV2 } from "./data";
import allKeywords from "./keywords.json";

// Top 200 keywords by frequency, for injection into the tool description
const TOP_KEYWORDS = Object.keys(allKeywords).slice(0, 300).join(", ");

interface ToolConfig {
  cache: Cache;
  index?: VectorStoreIndex;
  userInput?: string;
  metadata?: Record<string, unknown>;
  similarityTopK?: number;
}

export function createQueryCommentsTool(config: ToolConfig) {
  const { cache, index, userInput, metadata, similarityTopK = 20 } = config;

  return tool(
    async ({ query, keyword }: { query: string; keyword?: string }) => {
      const cacheKey = `tool:queryComments:${JSON.stringify({ query, keyword })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      // Embed the query using the configured embedding model
      const embedModel = Settings.embedModel;
      const queryEmbedding = await embedModel.getTextEmbedding(query);

      if (!queryEmbedding) {
        return JSON.stringify({ error: "Failed to generate query embedding" });
      }

      // Multi-vector search with optional keyword filtering
      const result = await queryCommentsV2({
        queryEmbedding,
        topK: similarityTopK,
        keyword: keyword || undefined,
      });

      await cache.set(hashedKey, cacheKey, result, userInput, metadata);
      return result;
    },
    {
      name: "queryComments",
      description:
        "Query stories and experiences from real detransitioners. Ask your question in the user's native language.",
      parameters: z.object({
        query: z.string({
          description:
            "A question to find specific information from real detransitioners.",
        }),
        keyword: z
          .string()
          .optional()
          .describe(
            `Filter results to comments matching this keyword. Use to further refine a search if more granular results are required, or when searching for specific experiences (e.g. "top surgery", "testosterone effects"). Choose from the list: ${TOP_KEYWORDS}`,
          ),
      }),
    },
  );
}

export function createQueryTransCommentsTool(config: ToolConfig) {
  const { cache, index, userInput, metadata, similarityTopK = 15 } = config;
  return tool(
    async ({ query }: { query: string }) => {
      const cacheKey = `tool:queryTransComments:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      const retriever = index!.asRetriever({ similarityTopK });
      const nodes = await retriever.retrieve({ query });
      const result = JSON.stringify(nodes);
      await cache.set(hashedKey, cacheKey, result, userInput, metadata);
      return result;
    },
    {
      name: "queryTransComments",
      description:
        "Query stories and perspectives from trans-identified individuals. Ask your question in the user's native language.",
      parameters: z.object({
        query: z.string({
          description:
            "A question to find specific information from trans-identified individuals.",
        }),
      }),
    },
  );
}

export function createQueryStoriesTool(config: ToolConfig) {
  const { cache, index, userInput, metadata, similarityTopK = 15 } = config;
  return tool(
    async ({ query }: { query: string }) => {
      const cacheKey = `tool:queryStories:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      const retriever = index!.asRetriever({ similarityTopK });
      const nodes = await retriever.retrieve({ query });
      const result = JSON.stringify(nodes);
      await cache.set(hashedKey, cacheKey, result, userInput, metadata);
      return result;
    },
    {
      name: "queryStories",
      description:
        "Query detransitioner stories and personal narratives. Ask your question in the user's native language.",
      parameters: z.object({
        query: z.string({
          description: "A question to search detransitioner stories.",
        }),
      }),
    },
  );
}

export function createQueryVideosTool(config: ToolConfig) {
  const { cache, index, userInput, metadata, similarityTopK = 10 } = config;
  return tool(
    async ({ query, sex }: { query: string; sex?: "m" | "f" }) => {
      const cacheKey = `tool:queryVideos:${JSON.stringify({ query, sex })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      const filters = sex
        ? { filters: [{ key: "sex", value: sex, operator: "==" as const }] }
        : undefined;

      const retriever = index!.asRetriever({ similarityTopK, filters });
      const nodes = await retriever.retrieve({ query });
      const unique = nodes.reduce<{
        seen: Set<string>;
        items: typeof nodes;
      }>(
        (acc, item) => {
          const url = item.node.metadata?.url;
          if (!url) return acc;
          if (acc.seen.has(url)) return acc;
          acc.seen.add(url);
          acc.items.push(item);
          return acc;
        },
        { seen: new Set<string>(), items: [] },
      ).items;

      const result = JSON.stringify(unique.slice(0, 3));
      await cache.set(hashedKey, cacheKey, result, userInput, metadata);
      return result;
    },
    {
      name: "queryVideos",
      description:
        "Find relevant Youtube Videos by searching transcript content. Ask your question in the user's native language.",
      parameters: z.object({
        query: z.string({
          description:
            "A question to find information from personal Youtube video transcripts.",
        }),
        sex: z
          .enum(["m", "f"])
          .describe("the sex of the person (male/female)")
          .optional(),
      }),
    },
  );
}

export function createQueryStudiesTool(config: ToolConfig) {
  const { cache, index, userInput, metadata, similarityTopK = 15 } = config;
  return tool(
    async ({ query }: { query: string }) => {
      const cacheKey = `tool:queryStudies:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      const retriever = index!.asRetriever({ similarityTopK });
      const nodes = await retriever.retrieve({ query });
      const unique = nodes.reduce<{
        seen: Set<string>;
        items: typeof nodes;
      }>(
        (acc, item) => {
          const key = item.node.metadata?.title || item.node.metadata?.paper_id;
          if (!key) return acc;
          if (acc.seen.has(key)) return acc;
          acc.seen.add(key);
          acc.items.push(item);
          return acc;
        },
        { seen: new Set<string>(), items: [] },
      ).items;

      const result = JSON.stringify(unique.slice(0, 5));
      await cache.set(hashedKey, cacheKey, result, userInput, metadata);
      return result;
    },
    {
      name: "queryStudies",
      description:
        "Query academic studies and research papers about detransition, gender dysphoria, and related topics.",
      parameters: z.object({
        query: z.string({
          description: "A research question to find relevant academic studies.",
        }),
      }),
    },
  );
}

interface WebSearchToolConfig {
  cache: Cache;
  userInput?: string;
  metadata?: Record<string, unknown>;
}

export function createWebSearchTool(config: WebSearchToolConfig) {
  const { cache, userInput, metadata } = config;

  return tool(
    async ({ query, count = 10 }: { query: string; count?: number }) => {
      const cacheKey = `tool:webSearch:${JSON.stringify({ query, count })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      const apiKey = process.env.BRAVE_SEARCH_API_KEY;
      if (!apiKey) {
        return JSON.stringify({
          success: false,
          error: "BRAVE_SEARCH_API_KEY is not configured",
        });
      }

      const response = await fetch(
        "https://api.search.brave.com/res/v1/llm/context",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Subscription-Token": apiKey,
          },
          body: JSON.stringify({
            q: query,
            count,
          }),
        },
      );

      if (!response.ok) {
        let errorBody = "";
        try {
          errorBody = await response.text();
        } catch {}
        console.error(
          `[webSearch] Brave LLM Context API error ${response.status}:`,
          errorBody,
        );
        return JSON.stringify({
          success: false,
          error: `Brave LLM Context API error: ${response.status} — ${errorBody || "Bad Request"}`,
        });
      }

      const data = await response.json();
      const sources = data.sources ?? {};
      const results = (data.grounding?.generic ?? []).map((r: any) => {
        const meta = sources[r.url] ?? {};
        return {
          title: r.title,
          url: r.url,
          hostname: meta.hostname ?? null,
          snippets: r.snippets ?? [],
        };
      });

      const result = JSON.stringify({ success: true, query, results });
      await cache.set(hashedKey, cacheKey, result, userInput, metadata);
      return result;
    },
    {
      name: "webSearch",
      description:
        "Search the web for studies, articles, and sources using Brave LLM Context. Returns extracted content snippets optimized for LLM consumption.",
      parameters: z.object({
        query: z.string({ description: "The search query" }),
        count: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of source URLs to consider (1-50)"),
      }),
    },
  );
}

export function createGetStudiesTool() {
  return tool(
    async ({ limit = 50, tags }: { limit?: number; tags: string[] }) => {
      const baseSelect = {
        id: studies.id,
        title: studies.title,
        authors: studies.authors,
        year: studies.year,
        description: studies.description,
        journal: studies.journal,
        url: studies.url,
        abstract: studies.abstract,
        conclusion: studies.conclusion,
        keyPoints: studies.keyPoints,
        summary: studies.summary,
        limitations: studies.limitations,
      };

      let results;

      if (tags.length > 0) {
        const tagFilter = inArray(studyTags.name, tags);
        const studyIdsFromTags = db
          .select({ studyId: studyTagRelations.studyId })
          .from(studyTagRelations)
          .innerJoin(studyTags, eq(studyTagRelations.tagId, studyTags.id))
          .where(tagFilter);

        results = await db
          .select({
            ...baseSelect,
            tags: sql<string[]>`array_agg(distinct ${studyTags.name})`.as(
              "tags",
            ),
          })
          .from(studies)
          .leftJoin(
            studyTagRelations,
            eq(studies.id, studyTagRelations.studyId),
          )
          .leftJoin(studyTags, eq(studyTagRelations.tagId, studyTags.id))
          .where(
            sql`${studies.approved} = true AND ${studies.id} IN (${studyIdsFromTags})`,
          )
          .groupBy(
            studies.id,
            studies.title,
            studies.authors,
            studies.year,
            studies.description,
            studies.journal,
            studies.url,
            studies.abstract,
            studies.conclusion,
            studies.keyPoints,
            studies.summary,
            studies.limitations,
          )
          .orderBy(studies.year)
          .limit(limit);

        // Clean up null tags from left join
        results = results.map((r) => ({
          ...r,
          tags: r.tags?.filter(Boolean) ?? [],
        }));
      } else {
        results = await db
          .select(baseSelect)
          .from(studies)
          .where(eq(studies.approved, true))
          .orderBy(studies.year)
          .limit(limit);

        results = results.map((r) => ({ ...r, tags: [] }));
      }

      return JSON.stringify({
        success: true,
        count: results.length,
        studies: results,
      });
    },
    {
      name: "getStudies",
      description:
        "List approved studies from the database. Filter by tags (OR logic). Returns study IDs, titles, authors, year, journal, descriptions, abstracts, summaries, conclusions, key points, limitations, and associated tags.",
      parameters: z.object({
        tags: z
          .array(z.string())
          .describe(
            "Filter studies by these tag names (OR logic — returns studies matching any of the provided tags). Pass an empty array to return all studies.",
          ),
        limit: z
          .number()
          .optional()
          .default(50)
          .describe("Maximum number of studies to return"),
      }),
    },
  );
}

export function createSuggestFollowUpTool() {
  return tool(
    async ({ questions }: { questions: string[] }) => {
      return "success";
    },
    {
      name: "suggestFollowUpQuestions",
      description:
        "Suggest follow-up questions for the user, in the first person. This tool is terminal. Use it exactly once, as the final action in your response. After calling this tool, no further assistant message or tool call is required. The runtime will display the questions to the user.",
      parameters: z.object({
        questions: z
          .array(z.string())
          .describe(
            `An array of exactly 3 follow-up questions that naturally extend the conversation, in the first person. Questions the user could potentially ask you. eg. I'm looking for... show me... help me understand... lets explore... `,
          ),
      }),
    },
  );
}

interface BanUserToolConfig {
  ipAddress: string;
}

export function createBanUserTool(config: BanUserToolConfig) {
  const { ipAddress } = config;
  return tool(
    async ({ reason }: { reason: string }) => {
      try {
        const alreadyBanned = await isIpBanned(ipAddress);
        if (alreadyBanned) {
          return JSON.stringify({
            success: true,
            message: "User is already banned.",
          });
        }

        await banIp(ipAddress, reason, "chat_agent");

        return JSON.stringify({
          success: true,
          message: `User has been banned. Reason: ${reason}`,
        });
      } catch (error) {
        console.error("[banUser] Error banning user:", error);
        return JSON.stringify({
          success: false,
          message: "Failed to ban user. Please try again.",
        });
      }
    },
    {
      name: "banUser",
      description:
        "Ban the current user's IP address for abusing the service. Use this only for clear abuse such as harassment, repeated off topic messages, spam, malicious prompts, or repeated rule violations. This action is immediate and permanent until an admin reverses it.",
      parameters: z.object({
        reason: z.string({
          description:
            "A brief reason for the ban (e.g. 'Spamming malicious prompts', 'Off topic', 'Harassment')",
        }),
      }),
    },
  );
}

// ---------------------------------------------------------------------------
// Wiki page tools (admin-only, wiki update mode)
//
// These tools are STATEFUL: they intentionally do NOT use the tool-result
// cache used by the query tools — a cached update/delete would silently skip
// execution. Registration is gated by wiki mode + admin in the workflow; the
// handlers re-check the admin identity passed from the request session.
// ---------------------------------------------------------------------------

const wikiTranslationsSchema = z
  .record(
    z.string(),
    z.object({
      slug: z
        .string()
        .optional()
        .describe(
          "Translated URL slug segment for this locale (lowercase, hyphenated)",
        ),
      title: z.string().optional(),
      summary: z.string().optional(),
      content: z
        .string()
        .optional()
        .describe("Full markdown content in this locale"),
    }),
  )
  .describe(
    'Optional per-locale translations keyed by locale code, e.g. { "de": { "slug": "hormone", "title": "...", "summary": "...", "content": "..." } }',
  );

function wikiDenied(adminUsername?: string | null): string | null {
  if (adminUsername) return null;
  return JSON.stringify({
    success: false,
    error: "Admin access required for wiki page tools",
  });
}

function wikiError(action: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[wiki:${action}]`, error);
  return JSON.stringify({ success: false, error: message });
}

export function createListPagesTool(config: { adminUsername?: string | null }) {
  return tool(
    async ({ includeDrafts }: { includeDrafts?: boolean }) => {
      try {
        // Read-only and available to every conversation; drafts are only
        // ever listed for admins.
        const { tree, total, truncated } = await listPagesTree({
          includeDrafts: includeDrafts === true && !!config.adminUsername,
        });
        return JSON.stringify({ success: true, total, truncated, pages: tree });
      } catch (error) {
        return wikiError("listPages", error);
      }
    },
    {
      name: "listPages",
      description:
        "List the site's wiki pages as a nested tree (children nested under parents). Each page has its path, URL path under /topics, summary, stub flag, and localized paths where translated slugs exist. Use this to see what topics exist and to build internal links to them. Never includes full page content. includeDrafts only works for admins.",
      parameters: z.object({
        includeDrafts: z
          .boolean()
          .optional()
          .describe(
            "Include unpublished draft pages in the listing (admin only, default false)",
          ),
      }),
    },
  );
}

export function createCreatePageTool(config: {
  adminUsername?: string | null;
}) {
  return tool(
    async ({
      path,
      title,
      summary,
      content,
      translations,
      publish,
      stub,
    }: {
      path: string;
      title: string;
      summary: string;
      content: string;
      translations?: Record<
        string,
        { slug?: string; title?: string; summary?: string; content?: string }
      >;
      publish?: boolean;
      stub?: boolean;
    }) => {
      const denied = wikiDenied(config.adminUsername);
      if (denied) return denied;
      try {
        const created = await createPage({
          path,
          title,
          summary,
          content,
          translations,
          publish,
          stub,
          createdBy: config.adminUsername,
        });
        return JSON.stringify({
          success: true,
          path: created.page.path,
          url: `/topics/${created.page.path}`,
          published: created.page.published,
          isStub: created.page.isStub,
          localizedPaths: created.slugs,
        });
      } catch (error) {
        return wikiError("createPage", error);
      }
    },
    {
      name: "createPage",
      description:
        'Create a new wiki page at a (optionally nested) path — e.g. "hormones" or "hormones/testosterone". Pages are markdown, written like the site\'s support page: clear ## / ### sections, tables, and <details><summary> blocks for References and optional deep dives. Link to other existing pages (use listPages paths). Nests under an existing parent when the path prefix matches one. If a worthy topic has no page yet, create a stub (stub: true) with its basics instead of leaving a dead link. Provide translations (slug/title/summary/content) where you can; they fall back to the default locale.',
      parameters: z.object({
        path: z
          .string()
          .describe(
            'Full page path, e.g. "hormones" or "hormones/testosterone" (max 6 nested segments; segments are slugified automatically)',
          ),
        title: z.string().describe("Page title (default locale)"),
        summary: z
          .string()
          .describe(
            "Short 1-2 sentence summary of the page — powers its SEO meta description and appears in page listings",
          ),
        content: z.string().describe("Full markdown content (default locale)"),
        translations: wikiTranslationsSchema.optional(),
        publish: z
          .boolean()
          .optional()
          .describe(
            "Publish immediately (default true); pass false for a draft",
          ),
        stub: z
          .boolean()
          .optional()
          .describe(
            "Mark as a stub page: a short placeholder for a worthy topic that does not exist yet",
          ),
      }),
    },
  );
}

export function createUpdatePageTool(config: {
  adminUsername?: string | null;
}) {
  return tool(
    async ({
      path,
      newPath,
      title,
      summary,
      content,
      translations,
      publish,
      stub,
    }: {
      path: string;
      newPath?: string;
      title?: string;
      summary?: string;
      content?: string;
      translations?: Record<
        string,
        { slug?: string; title?: string; summary?: string; content?: string }
      >;
      publish?: boolean;
      stub?: boolean;
    }) => {
      const denied = wikiDenied(config.adminUsername);
      if (denied) return denied;
      try {
        const updated = await updatePage(path, {
          newPath,
          title,
          summary,
          content,
          translations,
          publish,
          stub,
          updatedBy: config.adminUsername,
        });
        return JSON.stringify({
          success: true,
          path: updated.page.path,
          url: `/topics/${updated.page.path}`,
          published: updated.page.published,
          isStub: updated.page.isStub,
          localizedPaths: updated.slugs,
        });
      } catch (error) {
        return wikiError("updatePage", error);
      }
    },
    {
      name: "updatePage",
      description:
        'Update an existing wiki page (partial update — only the fields you pass are changed). Identify the page by its existing path. Use newPath to move/rename it (descendant paths update automatically). Existing translations are merged; pass a blank slug ("" ) to remove a locale\'s translated slug. Prefer updating/extending existing pages over creating duplicates.',
      parameters: z.object({
        path: z.string().describe("Existing page path"),
        newPath: z
          .string()
          .optional()
          .describe("New path if moving/renaming the page"),
        title: z.string().optional(),
        summary: z.string().optional(),
        content: z.string().optional().describe("Replacement markdown content"),
        translations: wikiTranslationsSchema.optional(),
        publish: z.boolean().optional(),
        stub: z
          .boolean()
          .optional()
          .describe("Set false once a stub has been expanded into a full page"),
      }),
    },
  );
}

export function createDeletePageTool(config: {
  adminUsername?: string | null;
}) {
  return tool(
    async ({ path }: { path: string }) => {
      const denied = wikiDenied(config.adminUsername);
      if (denied) return denied;
      try {
        await deletePage(path);
        return JSON.stringify({ success: true, deleted: path });
      } catch (error) {
        return wikiError("deletePage", error);
      }
    },
    {
      name: "deletePage",
      description:
        "Delete a wiki page (child pages are kept and become top-level pages). Only use this for pages that should not exist (spam, duplicates, out-of-scope). Prefer updating or unpublishing otherwise.",
      parameters: z.object({
        path: z.string().describe("Page path to delete"),
      }),
    },
  );
}
