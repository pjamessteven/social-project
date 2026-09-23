import { banIp, isIpBanned } from "@/app/lib/ipBan";
import {
  createPage,
  deletePage,
  getAllPagesWithSlugs,
  getLocalizedValue,
  getPageByPath,
  listPagesTree,
  updatePage,
} from "@/app/lib/pages";
import {
  applyUnifiedPatch,
  grepContent,
  runCat,
  runSed,
} from "@/app/lib/wiki-edit";
import { db } from "@/db";
import { studies, studyTagRelations, studyTags } from "@/db/schema";
import { defaultLocale } from "@/i18n/locales";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  MetadataMode,
  Settings,
  tool,
  type VectorStoreIndex,
} from "llamaindex";
import z from "zod";
import { type Cache, makeHashedKey } from "./cache";
import { queryCommentsV2 } from "./data";
import allKeywords from "./keywords.json";

// Top 200 keywords by frequency, for injection into the tool description
const TOP_KEYWORDS = Object.keys(allKeywords).slice(0, 300).join(", ");

// --- Result compaction helpers -------------------------------------------
// Retriever nodes serialize with embeddings and class internals (~26KB per
// node — measured). The LLM only needs text + score + metadata, so retriever
// results must go through compactNodes instead of JSON.stringify(nodes).

function compactNodes(
  items: Array<{ node?: any; score?: number | null }>,
): string {
  return JSON.stringify(
    items.map((item) => ({
      text:
        typeof item.node?.getContent === "function"
          ? item.node.getContent(MetadataMode.NONE)
          : (item.node?.text ?? ""),
      score: item.score ?? null,
      metadata: item.node?.metadata ?? {},
    })),
  );
}

function clampText(value: string | null, max = 600): string | null {
  if (!value) return value;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

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
      const cacheKey = `tool:queryTransComments:v2:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      const retriever = index!.asRetriever({ similarityTopK });
      const nodes = await retriever.retrieve({ query });
      const result = compactNodes(nodes);
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
      const cacheKey = `tool:queryStories:v2:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      const retriever = index!.asRetriever({ similarityTopK });
      const nodes = await retriever.retrieve({ query });
      const result = compactNodes(nodes);
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
      const cacheKey = `tool:queryVideos:v2:${JSON.stringify({ query, sex })}`;
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

      const result = compactNodes(unique.slice(0, 3));
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
      const cacheKey = `tool:queryStudies:v2:${JSON.stringify({ query })}`;
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

      const result = compactNodes(unique.slice(0, 5));
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
    async ({
      id,
      limit = 50,
      tags,
    }: {
      id?: number;
      limit?: number;
      tags?: string[];
    }) => {
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

      // Full record for a single study (used when citing a study in depth).
      if (id != null) {
        const [study] = await db
          .select(baseSelect)
          .from(studies)
          .where(and(eq(studies.id, id), eq(studies.approved, true)))
          .limit(1);
        if (!study) {
          return JSON.stringify({
            success: false,
            error: `Study ${id} not found or not approved`,
          });
        }
        return JSON.stringify({ success: true, study });
      }

      let results;

      const tagList = tags ?? [];
      if (tagList.length > 0) {
        const tagFilter = inArray(studyTags.name, tagList);
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

      // Compact listing mode: clamp long text fields so a 50-study listing
      // doesn't serialize to tens of thousands of tokens. Pass `id` for the
      // full record of a single study.
      results = results.map((r) => ({
        ...r,
        description: clampText(r.description),
        abstract: clampText(r.abstract),
        conclusion: clampText(r.conclusion),
        summary: clampText(r.summary),
        limitations: r.limitations?.slice(0, 8).map((k) => clampText(k, 300)),
        keyPoints: r.keyPoints?.slice(0, 8).map((k) => clampText(k, 300)),
      }));

      return JSON.stringify({
        success: true,
        count: results.length,
        studies: results,
      });
    },
    {
      name: "getStudies",
      description:
        "List approved studies (compact: long abstracts/conclusions are truncated). Filter by tags (OR logic). Pass `id` to fetch ONE study's full record — complete abstract, conclusion, key points and limitations — for studies you cite in depth. Returns study ids (for /studies/{id} links), titles, authors, year, journal, descriptions, and tags.",
      parameters: z.object({
        id: z
          .number()
          .optional()
          .describe(
            "Fetch the full record for a single study by its id (ignores tags/limit).",
          ),
        tags: z
          .array(z.string())
          .optional()
          .describe(
            "Filter studies by these tag names (OR logic — returns studies matching any of the provided tags). Omit or pass an empty array to return all studies.",
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
          title: created.page.title,
          summary: created.page.summary,
          contentPreview: created.page.content.slice(0, 400),
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
        const updatedFields = (
          [
            newPath !== undefined && newPath !== path && "path",
            title !== undefined && "title",
            summary !== undefined && "summary",
            content !== undefined && "content",
            translations !== undefined && "translations",
            publish !== undefined && "published",
            stub !== undefined && "stub",
          ] as Array<string | false>
        ).filter((field): field is string => typeof field === "string");

        return JSON.stringify({
          success: true,
          path: updated.page.path,
          url: `/topics/${updated.page.path}`,
          title: updated.page.title,
          summary: updated.page.summary,
          contentPreview: updated.page.content.slice(0, 400),
          updatedFields,
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
        const existing = await getPageByPath(path);
        await deletePage(path);
        return JSON.stringify({
          success: true,
          deleted: path,
          title: existing?.page.title,
        });
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

// ---------------------------------------------------------------------------
// Unix-style editing tools (admin-only, wiki update mode): edit page sections
// without rewriting whole pages. Page paths behave like file paths.
// Also STATEFUL on writes: no result caching.
// ---------------------------------------------------------------------------

const wikiLocaleSchema = z
  .string()
  .optional()
  .describe(
    'Locale of the content to operate on, e.g. "de". Defaults to the default locale.',
  );

function readPageContent(
  page: { content: string; contentTranslation: string | null },
  locale?: string,
): string {
  return (
    getLocalizedValue(
      page.contentTranslation,
      locale ?? defaultLocale,
      page.content,
    ) ?? ""
  );
}

async function writePageContent(
  path: string,
  content: string,
  locale: string | undefined,
  adminUsername?: string | null,
) {
  return locale && locale !== defaultLocale
    ? updatePage(path, {
        translations: { [locale]: { content } },
        updatedBy: adminUsername,
      })
    : updatePage(path, { content, updatedBy: adminUsername });
}

export function createGrepTool(config: { adminUsername?: string | null }) {
  return tool(
    async ({
      pattern,
      path,
      locale,
      ignoreCase,
      maxResults,
    }: {
      pattern: string;
      path?: string;
      locale?: string;
      ignoreCase?: boolean;
      maxResults?: number;
    }) => {
      const denied = wikiDenied(config.adminUsername);
      if (denied) return denied;
      try {
        const limit = Math.min(maxResults ?? 50, 200);
        const out: string[] = [];
        let matches = 0;
        let truncated = false;

        const searchPage = (
          item: Awaited<ReturnType<typeof getPageByPath>>,
        ) => {
          if (!item || truncated) return;
          const result = grepContent(
            readPageContent(item.page, locale),
            pattern,
            {
              ignoreCase,
            },
          );
          if (result.error) throw new Error(result.error);
          for (const match of result.matches) {
            if (matches >= limit) {
              truncated = true;
              return;
            }
            out.push(`${item.page.path}:${match.line}:${match.text}`);
            matches++;
          }
        };

        if (path) {
          const item = await getPageByPath(path);
          if (!item) {
            return JSON.stringify({
              success: false,
              error: `grep: ${path}: No such file or directory`,
            });
          }
          searchPage(item);
        } else {
          for (const item of await getAllPagesWithSlugs()) {
            searchPage(item);
            if (truncated) break;
          }
        }

        out.push(`-- ${matches} match(es)${truncated ? " (truncated)" : ""}`);
        return JSON.stringify({
          success: true,
          output: out.join("\n"),
          matches,
          path,
        });
      } catch (error) {
        return wikiError("grep", error);
      }
    },
    {
      name: "grep",
      description:
        "Search wiki page content like grep. Prints 'path:line:text' lines with 1-based line numbers (use them to target sed/patch). Without path, searches every page; with path, searches one page.",
      parameters: z.object({
        pattern: z
          .string()
          .describe("Regular expression to search for (JavaScript syntax)"),
        path: z
          .string()
          .optional()
          .describe("Limit the search to one page path (optional)"),
        locale: wikiLocaleSchema,
        ignoreCase: z.boolean().optional(),
        maxResults: z
          .number()
          .optional()
          .describe("Cap the matches (default 50)"),
      }),
    },
  );
}

export function createCatTool(config: { adminUsername?: string | null }) {
  return tool(
    async ({
      path,
      numbered,
      range,
      locale,
    }: {
      path: string;
      numbered?: boolean;
      range?: string;
      locale?: string;
    }) => {
      const denied = wikiDenied(config.adminUsername);
      if (denied) return denied;
      try {
        const item = await getPageByPath(path);
        if (!item) {
          return JSON.stringify({
            success: false,
            error: `cat: ${path}: No such file or directory`,
          });
        }
        const result = runCat(readPageContent(item.page, locale), {
          numbered,
          range,
        });
        return JSON.stringify({
          success: result.ok,
          path: item.page.path,
          title: item.page.title,
          output: result.output,
          ...(result.error ? { error: result.error } : {}),
        });
      } catch (error) {
        return wikiError("cat", error);
      }
    },
    {
      name: "cat",
      description:
        "Print a wiki page's markdown like cat. Use numbered: true (cat -n) to get line numbers for sed/patch edits, and range like '12-40' to read just one section.",
      parameters: z.object({
        path: z.string().describe("Page path, e.g. 'hormones/testosterone'"),
        numbered: z
          .boolean()
          .optional()
          .describe("Prefix lines with line numbers (like cat -n)"),
        range: z
          .string()
          .optional()
          .describe('Only print this line range, e.g. "12-40"'),
        locale: wikiLocaleSchema,
      }),
    },
  );
}

export function createSedTool(config: { adminUsername?: string | null }) {
  return tool(
    async ({
      path,
      script,
      locale,
    }: {
      path: string;
      script: string;
      locale?: string;
    }) => {
      const denied = wikiDenied(config.adminUsername);
      if (denied) return denied;
      try {
        const item = await getPageByPath(path);
        if (!item) {
          return JSON.stringify({
            success: false,
            error: `sed: ${path}: No such file or directory`,
          });
        }
        const result = runSed(readPageContent(item.page, locale), script);
        if (!result.ok) {
          return JSON.stringify({ success: false, error: result.output });
        }
        if (result.changed === 0) {
          return JSON.stringify({
            success: true,
            path: item.page.path,
            title: item.page.title,
            output: result.output,
            changedLines: 0,
          });
        }
        const updated = await writePageContent(
          path,
          result.content,
          locale,
          config.adminUsername,
        );
        return JSON.stringify({
          success: true,
          path: updated.page.path,
          url: `/topics/${updated.page.path}`,
          title: updated.page.title,
          summary: updated.page.summary,
          updatedFields: ["content"],
          changedLines: result.changed,
          output: result.output,
        });
      } catch (error) {
        return wikiError("sed", error);
      }
    },
    {
      name: "sed",
      description:
        "Edit a wiki page in place like sed -i. Supports s/pattern/replacement/flags (g, i) and d, optional N,M line addresses, and multiple commands separated by ';' or newlines. Flags are exactly 'g' and/or 'i' — nothing else (whitespace is ignored). Supports &, \\1-\\9 and \\n in replacements. Examples: 's/old/new/g', '12,40s/old/new/gi', '12,20d', 's/a/b/;5,8d'. Small edits only — use patch for multi-hunk rewrites.",
      parameters: z.object({
        path: z.string().describe("Page path to edit"),
        script: z
          .string()
          .describe("sed script, e.g. '12,40s/old/new/g' or '12,20d'"),
        locale: wikiLocaleSchema,
      }),
    },
  );
}

export function createPatchTool(config: { adminUsername?: string | null }) {
  return tool(
    async ({
      path,
      patch,
      locale,
    }: {
      path: string;
      patch: string;
      locale?: string;
    }) => {
      const denied = wikiDenied(config.adminUsername);
      if (denied) return denied;
      try {
        const item = await getPageByPath(path);
        if (!item) {
          return JSON.stringify({
            success: false,
            error: `patch: ${path}: No such file or directory`,
          });
        }
        const result = applyUnifiedPatch(
          readPageContent(item.page, locale),
          patch,
        );
        if (!result.ok) {
          return JSON.stringify({ success: false, error: result.output });
        }
        const updated = await writePageContent(
          path,
          result.content,
          locale,
          config.adminUsername,
        );
        return JSON.stringify({
          success: true,
          path: updated.page.path,
          url: `/topics/${updated.page.path}`,
          title: updated.page.title,
          summary: updated.page.summary,
          updatedFields: ["content"],
          changedLines: result.changed,
          output: result.output,
        });
      } catch (error) {
        return wikiError("patch", error);
      }
    },
    {
      name: "patch",
      description:
        "Apply a unified diff to a wiki page in place — rewrite whole sections without sending the whole page. Write standard @@ -a,b +c,d @@ hunks with a few lines of unchanged context around each edit, based on the CURRENT content — cat the section immediately before composing the patch. Context must match the file's wording exactly (leading/trailing whitespace and line-number drift are tolerated). On failure the error shows the expected vs found line — fix the context and retry.",
      parameters: z.object({
        path: z.string().describe("Page path to patch"),
        patch: z
          .string()
          .describe(
            "Unified diff against the page content (one or more @@ hunks)",
          ),
        locale: wikiLocaleSchema,
      }),
    },
  );
}
