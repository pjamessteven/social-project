import { RedisCache } from "@/app/lib/agents/cache";
import { getTransCommentsIndex, getVideosIndex } from "@/app/lib/agents/data";
import { initSettings } from "@/app/lib/agents/settings";
import {
  createBanUserTool,
  createGetStudiesTool,
  createQueryCommentsTool,
  createQueryTransCommentsTool,
  createQueryVideosTool,
  createWebSearchTool,
} from "@/app/lib/agents/tools";
import { db } from "@/db";
import { studyTags } from "@/db/schema";
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
  ipAddress?: string,
  includeTransPerspectives?: boolean,
) => {
  initSettings();

  const cache = new RedisCache("detrans_chat");
  const videosIndex = await getVideosIndex(reqBody?.data, locale);

  console.log("[WORKFLOW] Creating query tools...");

  const cacheMetadata = { conversationId, requestId, iteration };

  const queryCommentsTool = createQueryCommentsTool({
    cache,
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

  const getStudiesTool = createGetStudiesTool();

  const tools: any[] = [
    queryCommentsTool,
    queryVideosTool,
    getStudiesTool,
    webSearchTool,
  ];

  if (ipAddress) {
    const banUserTool = createBanUserTool({ ipAddress });
    tools.push(banUserTool);
  }

  if (includeTransPerspectives) {
    const transCommentsIndex = await getTransCommentsIndex(
      reqBody?.data,
      locale,
    );
    const queryTransCommentsTool = createQueryTransCommentsTool({
      cache,
      index: transCommentsIndex,
      userInput,
      metadata: cacheMetadata,
    });
    tools.push(queryTransCommentsTool);
  }

  const tags = await db.select({ name: studyTags.name }).from(studyTags);
  const tagNames = tags.map((t) => t.name).filter(Boolean);
  const tagList =
    tagNames.length > 0
      ? `\n\n### Available Study Tags\nThe following tags should be used to filter studies with the getStudies tool: ${tagNames.join(", ")}`
      : "";
  const systemPrompt = includeTransPerspectives
    ? agentPrompt.replace(
        "- Make liberal use of the queryCommentsTool",
        "- Make liberal use of the queryCommentsTool\n  - Use the queryTransCommentsTool to find experiences of transgender people. Include, explore and compare how trans perspectives relate and contrast to detrans perspectives on gender identity and transition.",
      ) + tagList
    : agentPrompt + tagList;

  const llm = new CachedOpenAI({
    cache,
    mode: "detrans_chat",
    // apiKey: process.env.KIMI_KEY,
    // baseURL: "https://api.moonshot.ai/v1",
    // model: "kimi-k2.6",
    // temperature: 0.6,
    // topP: 0.95,
    conversationId,
    requestId,
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "xiaomi/mimo-v2.5",
    temperature: 1,
    additionalSessionOptions: {
      thinking: { type: "disabled" },
    } as any,
    additionalChatOptions: {
      thinking: { type: "disabled" },
    } as any,
  });

  return agent({
    llm,
    tools,
    systemPrompt,
    timeout: 30,
  });
};
