import { agent } from "@llamaindex/workflow";
import { NodeWithScore, tool } from "llamaindex";
import z from "zod";
import { PostgresCache, makeHashedKey } from "../../shared/cache";
import { CachedOpenAI } from "../../shared/llm";
import { agentPrompt } from "../utils";
import { getCommentsIndex, getStoriesIndex, getVideosIndex } from "./data";
import { initSettings } from "./settings";

type FilterConfig = {
  sex?: string;
  tags?: string[];
  locale?: string;
};

type MetadataFilter = {
  key: string;
  value: string;
  operator: "==";
};

export const workflowFactory = async (
  reqBody: any,
  userInput: string,
  conversationId?: string,
  locale?: string,
) => {
  initSettings();

  // Initialize cache first since it's used by tools
  const cache = new PostgresCache("detrans_chat");

  const commentsIndex = await getCommentsIndex(reqBody?.data, locale);
  const storiesIndex = await getStoriesIndex(reqBody?.data, locale);
  const videosIndex = await getVideosIndex(reqBody?.data, locale);

  console.log("[WORKFLOW] Creating query tools...");

  const buildFilters = ({ sex, tags, locale: filterLocale }: FilterConfig) => {
    const filters: MetadataFilter[] = [];

    if (sex) {
      filters.push({ key: "sex", value: sex, operator: "==" });
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        filters.push({ key: "tags", value: tag, operator: "==" });
      }
    }

    if (filterLocale) {
      filters.push({ key: "locale", value: filterLocale, operator: "==" });
    }

    return filters.length > 0 ? { filters } : undefined;
  };

  const queryStoriesTool = tool(
    async ({
      query,
      sex,
      tags,
    }: {
      query: string;
      sex?: string;
      tags?: string[];
    }) => {
      const cacheKey = `tool:queryStories:${JSON.stringify({ query, sex, tags })}`;

      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        console.log("[CACHE HIT] queryStoriesTool");
        return cachedResult;
      }
      console.log("[CACHE MISS] queryStoriesTool");

      const filters = buildFilters({ sex, tags });
      const storiesEngineTool = storiesIndex.asRetriever({
        similarityTopK: 10,
        filters,
      });

      const nodes = await storiesEngineTool.retrieve({ query });
      const result = JSON.stringify(
        nodes.map((n: any) => ({
          username: n.node.metadata.username,
          story: n.node.text,
        })),
      );

      const hashedKey = makeHashedKey(cacheKey);
      await cache.set(hashedKey, cacheKey, result, undefined, {
        conversationId,
      });

      return result;
    },
    {
      name: "queryStories",
      description: "Query relevant stories",
      parameters: z.object({
        query: z.string(),
        sex: z.enum(["m", "f"]).optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
  );

  const queryCommentsTool = tool(
    async ({ query }: { query: string }) => {
      console.log("queryCommentsToolQuery", query);
      const cacheKey = `tool:queryComments:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);

      if (cachedResult) {
        console.log("[CACHE HIT] queryCommentsTool");
        return cachedResult;
      }
      console.log("[CACHE MISS] queryCommentsTool");
      const filters = buildFilters({});

      const commentsEngineTool = commentsIndex.asRetriever({
        similarityTopK: 15,
        filters,
      });

      const nodes = await commentsEngineTool.retrieve({ query });
      const result = JSON.stringify(nodes);

      await cache.set(hashedKey, cacheKey, result, userInput, {
        conversationId,
      });

      return result;
    },
    {
      name: "queryComments",
      description:
        "Query stories and experiences from real detransitioners. **Ask your question in the users native language**.",
      parameters: z.object({
        query: z.string({
          description:
            "A question to find more specific information from real detransitioners. **Ask your question in the users native language**.'",
        }),
      }),
    },
  );

  const queryVideosTool = tool(
    async ({ query, sex }: { query: string; sex?: "m" | "f" }) => {
      const cacheKey = `tool:queryVideos:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);

      if (cachedResult) {
        console.log("[CACHE HIT] queryVideosTool");
        return cachedResult;
      }
      console.log("[CACHE MISS] queryVideosTool");

      const filters = buildFilters({ sex });
      const videosEngineTool = videosIndex.asRetriever({
        similarityTopK: 10,
        filters,
      });

      const nodes = await videosEngineTool.retrieve({ query });
      const unique = nodes.reduce<{
        seen: Set<string>;
        items: NodeWithScore[];
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

      await cache.set(hashedKey, cacheKey, result, userInput, {
        conversationId,
      });

      return result;
    },
    {
      name: "queryVideos",
      description:
        "Find relevant Youtube Videos by searching transcript content. **Ask your question in the users native language.**",
      parameters: z.object({
        query: z.string({
          description:
            "A clear question to find more specific information from personal Youtube video transcripts. **Ask your question in the users native language**'",
        }),
        sex: z
          .enum(["m", "f"])
          .describe("the sex of the person (male/female)")
          .optional(),
      }),
    },
  );

  const llm = new CachedOpenAI({
    cache,
    mode: "detrans_chat",
    apiKey: process.env.KIMI_KEY,
    baseURL: "https://api.moonshot.ai/v1",
    model: "kimi-k2.5",
    conversationId,
    temperature: 0.6,
    topP: 0.95,
    additionalSessionOptions: {
      thinking: { type: "disabled" },
    } as any,
    additionalChatOptions: {
      thinking: { type: "disabled" },
    } as any,
  });

  return agent({
    llm,
    tools: [queryCommentsTool, queryVideosTool],
    systemPrompt: agentPrompt,
    timeout: 30,
  });
};
