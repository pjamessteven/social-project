import { CustomOpenAI } from "@/app/api/shared/llm";
import { RedisCache } from "@/app/lib/agents/cache";
import { getCommentsIndex, getVideosIndex } from "@/app/lib/agents/data";
import { initSettings } from "@/app/lib/agents/settings";
import {
  createGetStudiesTool,
  createQueryCommentsTool,
  createQueryVideosTool,
  createWebSearchTool,
} from "@/app/lib/agents/tools";
import { openRouterProvider } from "@/app/lib/openrouter";
import { db } from "@/db";
import { studyCategories } from "@/db/schema";
import { agent } from "@llamaindex/workflow";
import { twitterBotPrompt } from "./prompt";

export async function createTwitterWorkflow() {
  initSettings();

  const cache = new RedisCache("detrans_chat");
  const commentsIndex = await getCommentsIndex();
  const videosIndex = await getVideosIndex();

  const queryCommentsTool = createQueryCommentsTool({
    cache,
    index: commentsIndex,
  });

  const queryVideosTool = createQueryVideosTool({
    cache,
    index: videosIndex,
  });

  const webSearchTool = createWebSearchTool({ cache });
  const getStudiesTool = createGetStudiesTool();

  const categories = await db
    .select({ name: studyCategories.name })
    .from(studyCategories);
  const categoryNames = categories.map((c) => c.name).filter(Boolean);
  const studyCategoryList =
    categoryNames.length > 0
      ? `\n\n### Study Categories\nUse these names in the getStudies tool's categories filter: ${categoryNames.join(", ")}`
      : "";
  const systemPrompt = twitterBotPrompt + studyCategoryList;

  const llm = new CustomOpenAI({
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "xiaomi/mimo-v2.6-flash",
    temperature: 1,
    contextWindow: 256000,
    additionalChatOptions: {
      provider: openRouterProvider,
      thinking: { type: "disabled" },
    } as any,
  });

  return agent({
    llm,
    tools: [queryCommentsTool, queryVideosTool, getStudiesTool, webSearchTool],
    systemPrompt,
    timeout: 120,
  });
}
