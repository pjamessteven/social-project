import { PostgresCache } from "@/app/lib/agents/cache";
import { getCommentsIndex, getVideosIndex } from "@/app/lib/agents/data";
import { initSettings } from "@/app/lib/agents/settings";
import {
  createQueryCommentsTool,
  createQueryVideosTool,
  createWebSearchTool,
  getStudiesTool,
} from "@/app/lib/agents/tools";
import { agent } from "@llamaindex/workflow";
import { CachedOpenAI } from "../../shared/llm";
import { agentPrompt } from "../utils/prompts";

export const workflowFactory = async (
  reqBody: any,
  userInput: string,
  conversationId?: string,
  requestId?: string,
  iteration?: number,
  locale?: string,
) => {
  initSettings();

  const cache = new PostgresCache("detrans_chat");
  const commentsIndex = await getCommentsIndex(reqBody?.data, locale);
  const videosIndex = await getVideosIndex(reqBody?.data, locale);

  console.log("[WORKFLOW] Creating query tools...");

  const cacheMetadata = { conversationId, requestId, iteration };

  const queryCommentsTool = createQueryCommentsTool({
    cache,
    index: commentsIndex,
    userInput,
    metadata: cacheMetadata,
  });

  const queryVideosTool = createQueryVideosTool({
    cache,
    index: videosIndex,
    userInput,
    metadata: cacheMetadata,
  });

  const webSearchTool = createWebSearchTool({
    cache,
    userInput,
    metadata: cacheMetadata,
  });

  const llm = new CachedOpenAI({
    cache,
    mode: "detrans_chat",
    apiKey: process.env.KIMI_KEY,
    baseURL: "https://api.moonshot.ai/v1",
    model: "kimi-k2.6",
    conversationId,
    requestId,
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
    tools: [queryCommentsTool, queryVideosTool, getStudiesTool, webSearchTool],
    systemPrompt: agentPrompt,
    timeout: 30,
  });
};
