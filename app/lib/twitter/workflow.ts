import { CustomOpenAI } from "@/app/api/shared/llm";
import { db } from "@/db";
import { studyTags } from "@/db/schema";
import { RedisCache } from "@/app/lib/agents/cache";
import { getCommentsIndex, getVideosIndex } from "@/app/lib/agents/data";
import { initSettings } from "@/app/lib/agents/settings";
import {
  createQueryCommentsTool,
  createQueryVideosTool,
  createWebSearchTool,
  createGetStudiesTool,
} from "@/app/lib/agents/tools";
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

  const tags = await db.select({ name: studyTags.name }).from(studyTags);
  const tagNames = tags.map((t) => t.name).filter(Boolean);
  const tagList =
    tagNames.length > 0
      ? `\n\n### Available Study Tags\nThe following tags should be used to filter studies with the getStudies tool: ${tagNames.join(", ")}`
      : "";
  const systemPrompt = twitterBotPrompt + tagList;

  const llm = new CustomOpenAI({
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "xiaomi/mimo-v2.5",
    temperature: 1,
    contextWindow: 256000,
    additionalChatOptions: {
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
