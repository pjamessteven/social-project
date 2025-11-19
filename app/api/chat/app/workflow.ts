import { agent } from "@llamaindex/workflow";
import { NodeWithScore, tool } from "llamaindex";
import z from "zod";
import { PostgresCache } from "../../shared/cache";
import { CachedOpenAI } from "../../shared/llm";
import { agentPrompt } from "../utils";
import { getCommentsIndex, getStoriesIndex, getVideosIndex } from "./data";
import { initSettings } from "./settings";

export const workflowFactory = async (
  reqBody: any,
  userInput: string,
  conversationId?: string,
) => {
  initSettings();
  const commentsIndex = await getCommentsIndex(reqBody?.data);
  const storiesIndex = await getStoriesIndex(reqBody?.data);
  const videosIndex = await getVideosIndex(reqBody?.data);

  console.log("[WORKFLOW] Creating query tools...");

  const buildFilters = ({ sex, tags }: { sex?: string; tags?: string[] }) => {
    const filters: any[] = [];

    if (sex) {
      filters.push({ key: "sex", value: sex, operator: "==" });
    }

    if (tags && tags.length > 0) {
      // Each tag is required → multiple == conditions
      for (const tag of tags) {
        filters.push({ key: "tags", value: tag, operator: "==" });
      }
    }

    return filters.length > 0 ? { filters } : undefined;
  };

  const queryStoriesTool = tool(
    async ({ query, sex, tags }) => {
      // Build filters dynamically
      const filters = buildFilters({ sex, tags });
      const storiesEngineTool = storiesIndex.asRetriever({
        similarityTopK: 10,
        filters,
      });

      const nodes = await storiesEngineTool.retrieve({ query });
      return JSON.stringify(
        nodes.map((n: any) => ({
          username: n.node.metadata.username,
          story: n.node.text,
        })),
      );
    },
    {
      name: "queryStories",
      description: "Query relevant stories",
      parameters: z.object({
        query: z.string(),
        //     sex: z.enum(["m", "f"]).optional(),
        //    tags: z.array(z.enum(["", ...availableTags]).optional()),
      }),
    },
  );

  // define tool with zod validation
  const queryCommentsTool = tool(
    async ({ query }) => {
      const commentsEngineTool = commentsIndex.asRetriever({
        similarityTopK: 15,
      });

      const nodes = await commentsEngineTool.retrieve({ query });
      return JSON.stringify(nodes);
    },
    {
      name: "queryComments",
      description: "Query stories and experiences from real detransitioners",
      parameters: z.object({
        query: z.string({
          description:
            "A question to find more specific information from real detransitioners. It should be a properly worded question in English.'",
        }),
      }),
    },
  );
  // define tool with zod validation
  const queryVideosTool = tool(
    async ({ query, sex }) => {
      const filters = buildFilters({ sex });
      const videosEngineTool = videosIndex.asRetriever({
        similarityTopK: 10,
        filters,
      });
      // 3. Safely access the query, handling the optional 'params'
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

      return JSON.stringify(unique.slice(0, 3));
    },
    {
      name: "queryVideos",
      description:
        "Find relevant Youtube Videos by searching transcript content",
      parameters: z.object({
        query: z.string({
          description:
            "A clear question to find more specific information from personal Youtube video transcripts. It should be a properly worded question in English.'",
        }),
        sex: z
          .enum(["m", "f"])
          .describe("the sex of the person (male/female)")
          .optional(),
      }),
    },
  );

  const cache = new PostgresCache("detrans_chat");

  const llm = new CachedOpenAI({
    cache,
    mode: "detrans_chat",
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "moonshotai/kimi-k2-0905:exacto",
    conversationId,
  });

  /*
 const llm = new OpenAI({
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "moonshotai/kimi-k2-0905:exacto",
 })
  */

  return agent({
    llm,
    tools: [queryCommentsTool, queryVideosTool],
    systemPrompt: agentPrompt,
    timeout: 30,
  });
};
