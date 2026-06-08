import { db } from "@/db";
import { studies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { tool, type VectorStoreIndex } from "llamaindex";
import z from "zod";
import { type Cache, makeHashedKey } from "./cache";

interface ToolConfig {
  cache: Cache;
  index: VectorStoreIndex;
  userInput?: string;
  metadata?: Record<string, unknown>;
  similarityTopK?: number;
}

export function createQueryCommentsTool(config: ToolConfig) {
  const { cache, index, userInput, metadata, similarityTopK = 15 } = config;
  return tool(
    async ({ query }: { query: string }) => {
      const cacheKey = `tool:queryComments:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);
      if (cachedResult) return cachedResult;

      const retriever = index.asRetriever({ similarityTopK });
      const nodes = await retriever.retrieve({ query });
      const result = JSON.stringify(nodes);
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

      const retriever = index.asRetriever({ similarityTopK });
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

      const retriever = index.asRetriever({ similarityTopK });
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

      const retriever = index.asRetriever({ similarityTopK, filters });
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

      const retriever = index.asRetriever({ similarityTopK });
      const nodes = await retriever.retrieve({ query });
      const unique = nodes.reduce<{
        seen: Set<string>;
        items: typeof nodes;
      }>(
        (acc, item) => {
          const key =
            item.node.metadata?.title || item.node.metadata?.paper_id;
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
          description:
            "A research question to find relevant academic studies.",
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

export const getStudiesTool = tool(
  async ({ limit = 50 }: { limit?: number }) => {
    const results = await db
      .select({
        id: studies.id,
        title: studies.title,
        authors: studies.authors,
        year: studies.year,
        description: studies.description,
        journal: studies.journal,
        url: studies.url,
      })
      .from(studies)
      .where(eq(studies.approved, true))
      .orderBy(studies.year)
      .limit(limit);

    return JSON.stringify({ success: true, count: results.length, studies: results });
  },
  {
    name: "getStudies",
    description:
      "List approved studies from the database. Returns study IDs, titles, authors, year, journal, and descriptions.",
    parameters: z.object({
      limit: z.number().optional().default(50).describe("Maximum number of studies to return"),
    }),
  },
);
