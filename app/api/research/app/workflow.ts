import { agent } from "@llamaindex/workflow";
import { tool } from "llamaindex";
import z from "zod";
import { PostgresCache, makeHashedKey } from "../../shared/cache";
import { CachedOpenAI } from "../../shared/llm";
import { agentPrompt } from "../utils";
import { getCommentsIndex } from "./data";
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

  locale?: string,
) => {
  initSettings();

  // Initialize cache first since it's used by tools
  const cache = new PostgresCache("deep_research");

  const commentsIndex = await getCommentsIndex(reqBody?.data, locale);

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

      const commentsEngineTool = commentsIndex.asRetriever({
        similarityTopK: 15,
      });

      const nodes = await commentsEngineTool.retrieve({ query });
      const result = JSON.stringify(nodes);

      await cache.set(hashedKey, cacheKey, result, userInput);

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

  const llm = new CachedOpenAI({
    cache,
    mode: "deep_research",
    apiKey: process.env.KIMI_KEY,
    baseURL: "https://api.moonshot.ai/v1",
    model: "kimi-k2.5",
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
    tools: [queryCommentsTool],
    systemPrompt: agentPrompt,
    timeout: 30,
  });
};
