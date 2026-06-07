import { agent } from "@llamaindex/workflow";
import { tool } from "llamaindex";
import z from "zod";
import { getCommentsIndex, getStudiesIndex } from "@/app/lib/agents/data";
import { PostgresCache, makeHashedKey } from "@/app/lib/agents/cache";
import { CachedOpenAI } from "../../shared/llm";
import { agentPrompt } from "../utils/prompts";
import { initSettings } from "@/app/lib/agents/settings";

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
  requestId?: string,
  locale?: string,
) => {
  initSettings();

  // Initialize cache first since it's used by tools
  const cache = new PostgresCache("deep_research");

  const commentsIndex = await getCommentsIndex(reqBody?.data, locale);
  const studiesIndex = await getStudiesIndex(reqBody?.data, locale);

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

      await cache.set(hashedKey, cacheKey, result, userInput, { requestId });

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

  function deduplicateStudies(nodes: any[]) {
    const uniqueStudies = nodes.reduce<
      Map<
        number,
        {
          studyId: number;
          title: string;
          authors: string;
          year: number;
          url: string;
          abstract: string;
          conclusion: string;
          keyPoints: string[];
          chunks: string[];
        }
      >
    >((acc, item) => {
      const meta = item.node.metadata;
      const studyId = meta?.studyId as number;
      if (!studyId) return acc;

      if (!acc.has(studyId)) {
        acc.set(studyId, {
          studyId: studyId,
          title: meta?.title || "",
          authors: meta?.authors || "",
          year: meta?.year || 0,
          url: meta?.url || "",
          abstract: meta?.abstract || "",
          conclusion: meta?.conclusion || "",
          keyPoints: [],
          chunks: [],
        });
      }

      const study = acc.get(studyId)!;
      study.chunks.push((item.node as any).text || "");

      // Parse keyPoints once
      if (study.keyPoints.length === 0 && meta?.keyPoints) {
        try {
          const kp = JSON.parse(meta.keyPoints as string);
          if (Array.isArray(kp)) {
            study.keyPoints = kp;
          }
        } catch {
          // ignore parse errors
        }
      }

      return acc;
    }, new Map());

    return Array.from(uniqueStudies.values()).slice(0, 5);
  }

  const queryStudiesTool = tool(
    async ({ query }: { query: string }) => {
      const cacheKey = `tool:queryStudies:${JSON.stringify({ query })}`;
      const hashedKey = makeHashedKey(cacheKey);
      const cachedResult = await cache.get(hashedKey);

      if (cachedResult) {
        console.log("[CACHE HIT] queryStudiesTool");
        return cachedResult;
      }
      console.log("[CACHE MISS] queryStudiesTool");

      const studiesEngineTool = studiesIndex.asRetriever({
        similarityTopK: 15,
      });

      const nodes = await studiesEngineTool.retrieve({ query });
      const result = JSON.stringify(deduplicateStudies(nodes));

      await cache.set(hashedKey, cacheKey, result, userInput, {
        requestId,
      });

      return result;
    },
    {
      name: "queryStudies",
      description:
        "Search academic studies on gender-affirming care (GAC). Use this to find evidence, research findings, methodological analyses, or clinical data related to medical transition. **Ask your question in the users native language**.",
      parameters: z.object({
        query: z.string({
          description:
            "A specific question to search academic studies. **Ask your question in the users native language**.'",
        }),
      }),
    },
  );

  const llm = new CachedOpenAI({
    cache,
    mode: "deep_research",
    apiKey: process.env.KIMI_KEY,
    baseURL: "https://api.moonshot.ai/v1",
    model: "kimi-k2.6",
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
    tools: [queryCommentsTool, queryStudiesTool],
    systemPrompt: agentPrompt,
    timeout: 30,
  });
};
