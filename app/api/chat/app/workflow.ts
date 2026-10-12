import { RedisCache } from "@/app/lib/agents/cache";
import { getTransCommentsIndex, getVideosIndex } from "@/app/lib/agents/data";
import { initSettings } from "@/app/lib/agents/settings";
import {
  createBanUserTool,
  createCatTool,
  createCreatePageTool,
  createDeletePageTool,
  createGetStudiesTool,
  createGrepTool,
  createListPagesTool,
  createPatchTool,
  createQueryCommentsTool,
  createQueryTransCommentsTool,
  createQueryVideosTool,
  createSedTool,
  createUpdatePageTool,
  createWebSearchTool,
} from "@/app/lib/agents/tools";
import { db, withDbTimeout } from "@/db";
import { studyTags } from "@/db/schema";
import { agent } from "@llamaindex/workflow";
import { openRouterProvider } from "@/app/lib/openrouter";
import { CachedOpenAI } from "../../shared/llm";
import { agentPrompt, wikiUpdateModePrompt } from "../utils/prompts";

export const workflowFactory = async (
  reqBody: any,
  userInput: string,
  conversationId?: string,
  requestId?: string,
  iteration?: number,
  locale?: string,
  ipAddress?: string,
  includeTransPerspectives?: boolean,
  enforceCaptcha?: boolean,
  adminUsername?: string | null,
  wikiMode?: boolean,
  proModel?: boolean,
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

  // Read-only wiki listing is available in every conversation (published
  // pages only unless the caller is an admin) so the agent can show and link
  // topics for all users.
  tools.push(createListPagesTool({ adminUsername }));

  // Wiki page WRITE tools: admin-only and only in wiki update mode. Stateful
  // tools — they intentionally bypass the result cache used by query tools.
  if (wikiMode && adminUsername) {
    tools.push(
      createCreatePageTool({ adminUsername }),
      createUpdatePageTool({ adminUsername }),
      createDeletePageTool({ adminUsername }),
      // Unix-style section editing (grep/cat/sed/patch)
      createGrepTool({ adminUsername }),
      createCatTool({ adminUsername }),
      createSedTool({ adminUsername }),
      createPatchTool({ adminUsername }),
    );
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

  const tags = await withDbTimeout(
    db.select({ name: studyTags.name }).from(studyTags),
  );
  const tagNames = tags.map((t) => t.name).filter(Boolean);
  const tagList =
    tagNames.length > 0
      ? `\n\n### Available Study Tags\nThe following tags can be used to filter studies with the getStudies tool: ${tagNames.join(", ")}`
      : "";
  // Observability: make tool registration visible per request (this is the
  // first place to look when the agent claims it "has no tools"). LlamaIndex
  // tool() objects carry their identity on .metadata, not .name.
  console.log(
    `[WORKFLOW] tools=[${tools.map((t: any) => t?.metadata?.name ?? t?.name ?? "?").join(",")}] wikiMode=${!!wikiMode} admin=${adminUsername ?? "-"} pro=${!!proModel}`,
  );

  const systemPrompt =
    agentPrompt +
    tagList +
    (adminUsername ? (wikiMode ? wikiUpdateModePrompt : "") : "");

  // Model selection: admins can opt into the Pro model per message.
  const chatModel = proModel
    ? "xiaomi/mimo-v2.6-pro"
    : "xiaomi/mimo-v2.6-flash";

  const llm = new CachedOpenAI({
    cache,
    mode: "detrans_chat",
    conversationId,
    requestId,
    enforceCaptcha,
    // apiKey: process.env.XIAOMI_KEY,
    // baseURL: "https://token-plan-sgp.xiaomimimo.com/v1",
    // model: "mimo-v2.5",
    //
    //
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: chatModel,
    // Admins (wiki maintenance) generate very long pages and tool payloads;
    // everyone else keeps the library's default output budget.
    ...(adminUsername ? { maxTokens: 50_000 } : {}),
    additionalChatOptions: {
      // OpenRouter-native reasoning kill switch. Both mimo-v2.6 models report
      // reasoning.mandatory=false, so disabling is accepted. This MUST go
      // through `reasoning` — the Xiaomi-native `thinking` switch is not a
      // supported OpenRouter parameter and gets ignored, leaving thinking on;
      // its tokens then eat max_tokens and the response comes back as
      // finish_reason=length with EMPTY content.
      reasoning: { enabled: false, effort: "none" },
      provider: openRouterProvider,
      // Xiaomi-native switch — kept as provider passthrough for direct-Xiaomi
      // fallback configs (harmless when ignored).
      thinking: { type: "disabled" },
    } as any,
    fallback: {
      apiKey: process.env.OPENROUTER_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: chatModel,
      additionalChatOptions: {
        provider: openRouterProvider,
        thinking: { type: "disabled" },
      } as any,
    },
  });

  return {
    workflow: agent({
      llm,
      tools,
      systemPrompt,
      timeout: 30,
    }),
    llm,
  };
};
