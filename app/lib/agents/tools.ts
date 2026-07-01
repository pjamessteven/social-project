import { banIp, isIpBanned } from "@/app/lib/ipBan";
import { db } from "@/db";
import { studies, studyTagRelations, studyTags } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
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
  const { cache, index, userInput, metadata, similarityTopK = 20 } = config;
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
