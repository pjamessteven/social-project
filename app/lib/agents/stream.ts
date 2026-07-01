import {
  agentStreamEvent,
  agentToolCallEvent,
  agentToolCallResultEvent,
  type WorkflowEvent,
  type WorkflowEventData,
} from "@llamaindex/workflow";
import { createUIMessageStream, UIMessage, UIMessageStreamWriter } from "ai";
import { randomUUID } from "crypto";
import type { ChatMessage, ChatResponseChunk } from "llamaindex";
import { humanInputEvent, type HumanResponseEventData } from "./hitl";
import { generateNextQuestions } from "../../api/chat/utils/suggestion";

export interface StreamCallbacks {
  onStart?: (dataStreamWriter: UIMessageStreamWriter) => Promise<void> | void;
  onFinal?: (
    messages: UIMessage[],
    dataStreamWriter: UIMessageStreamWriter,
  ) => Promise<void> | void;
  onText?: (
    text: string,
    dataStreamWriter: UIMessageStreamWriter,
  ) => Promise<void> | void;
  onPauseForHumanInput?:
    | ((event: WorkflowEvent<HumanResponseEventData>) => Promise<void> | void)
    | undefined;
}

const TOOL_UI_MAP: Record<
  string,
  {
    type: string;
    titleStart: string;
    titleEnd: string;
    displayQuery?: "auto" | "none";
  }
> = {
  // Chat/research grounding tools
  queryVideos: {
    type: "data-video-query-event",
    titleStart: "Querying videos...",
    titleEnd: "Queried user videos",
  },
  queryStories: {
    type: "data-story-query-event",
    titleStart: "Querying user stories...",
    titleEnd: "Queried user stories",
  },
  queryComments: {
    type: "data-comment-query-event",
    titleStart: "Querying user comments...",
    titleEnd: "Queried user comments",
  },
  queryTransComments: {
    type: "data-comment-query-event",
    titleStart: "Querying user comments...",
    titleEnd: "Queried user comments",
  },
  queryStudies: {
    type: "data-study-query-event",
    titleStart: "Querying studies...",
    titleEnd: "Queried studies",
    displayQuery: "none",
  },
  querySupportiveStudies: {
    type: "data-study-query-event",
    titleStart: "Querying studies...",
    titleEnd: "Queried studies",
    displayQuery: "none",
  },
  webSearch: {
    type: "data-web-search-event",
    titleStart: "Searching the web...",
    titleEnd: "Web search complete",
  },
  getStudies: {
    type: "data-get-studies-event",
    titleStart: "Fetching studies...",
    titleEnd: "Studies loaded",
    displayQuery: "none",
  },
};

/**
 * Extract a display-friendly query string from tool kwargs.
 * Returns the most meaningful string field for display in the UI.
 * Appends keyword filters if present.
 */
function extractDisplayQuery(
  toolKwargs: Record<string, any> | undefined,
): string {
  if (!toolKwargs) return "";

  // Find the primary query string
  let query = "";
  for (const key of ["query", "name", "slug", "title"]) {
    if (toolKwargs[key] && typeof toolKwargs[key] === "string") {
      query = toolKwargs[key];
      break;
    }
  }
  if (!query) {
    const firstString = Object.values(toolKwargs).find(
      (v) => typeof v === "string",
    );
    query = firstString ? String(firstString) : "";
  }

  // Append keyword filter if present
  const keyword = toolKwargs.keyword;
  if (typeof keyword === "string" && keyword.length > 0) {
    query = query ? `${query} [${keyword}]` : `[${keyword}]`;
  }

  return query;
}

/**
 * Get the display query for a tool call based on TOOL_UI_MAP config.
 */
function getDisplayQuery(
  toolName: string,
  toolKwargs: Record<string, any> | undefined,
): string {
  const config = TOOL_UI_MAP[toolName];
  if (!config?.displayQuery || config.displayQuery === "auto") {
    return extractDisplayQuery(toolKwargs);
  }
  if (config.displayQuery === "none") return "";
  return "";
}

export function toDataStream(
  originalMessages: UIMessage[],
  stream: AsyncIterable<WorkflowEventData<unknown>>,
  conversationId: string,
  options: {
    callbacks?: StreamCallbacks;
    chatHistory?: ChatMessage[];
    suggestNextQuestions?: boolean;
  } = {},
) {
  const { callbacks, chatHistory, suggestNextQuestions } = options;

  let completionText = "";
  let hasStarted = false;
  let textId: string | null = null;
  let streamWriter: UIMessageStreamWriter | null = null;

  const closeTextBlock = (writer: any) => {
    if (textId) {
      writer.write({ type: "text-end", id: textId });
      textId = null;
    }
  };

  return createUIMessageStream({
    originalMessages,
    async execute({ writer }) {
      try {
        streamWriter = writer;
        if (!hasStarted && callbacks?.onStart) {
          await callbacks.onStart(writer);
          hasStarted = true;
        }

        for await (const event of stream) {
          // Text streaming
          if (agentStreamEvent.include(event) && event.data.delta) {
            if (!textId) {
              textId = `text-${randomUUID()}`;
              writer.write({ type: "text-start", id: textId });
            }
            completionText += event.data.delta;
            writer.write({
              type: "text-delta",
              id: textId,
              delta: event.data.delta,
            });
            if (callbacks?.onText)
              await callbacks.onText(event.data.delta, writer);
          }

          // Human input interrupts
          if (humanInputEvent.include(event)) {
            closeTextBlock(writer);
            const { response, ...rest } = event.data;
            writer.write({ type: "data-annotation", data: rest });
            if (callbacks?.onPauseForHumanInput) {
              await callbacks.onPauseForHumanInput(response);
              return;
            }
          }

          // Tool call start — emit data event for UI
          if (agentToolCallEvent.include(event)) {
            closeTextBlock(writer);
            const config = TOOL_UI_MAP[event.data.toolName];
            if (config) {
              writer.write({
                type: config.type as any,
                id: event.data.toolId,
                data: {
                  title: config.titleStart,
                  query: getDisplayQuery(
                    event.data.toolName,
                    event.data.toolKwargs,
                  ),
                },
              });
            }
          }

          // Tool call result — emit data event for UI
          if (agentToolCallResultEvent.include(event)) {
            closeTextBlock(writer);
            const config = TOOL_UI_MAP[event.data.toolName];
            if (config) {
              writer.write({
                type: config.type as any,
                id: event.data.toolId,
                data: {
                  title: config.titleEnd,
                  query: getDisplayQuery(
                    event.data.toolName,
                    event.data.toolKwargs,
                  ),
                  result: event.data.raw,
                  status: event.data.toolOutput.isError ? "error" : "success",
                },
              });
            } else {
              writer.write({
                type: "data-default-event" as any,
                id: event.data.toolId,
                data: {
                  title: "Done",
                  query: event.data.toolKwargs.query,
                  result: event.data.raw,
                  status: event.data.toolOutput.isError ? "error" : "success",
                },
              });
            }
          }
        }

        // TODO: Re-enable when we have a faster model or caching
        // Generate follow-up questions as a second pass after the main stream
        // if (suggestNextQuestions && chatHistory && chatHistory.length > 0) {
        //   try {
        //     const questions = await generateNextQuestions(chatHistory, conversationId);
        //     if (questions.length > 0) {
        //       writer.write({
        //         type: "data-questions-event" as any,
        //         data: {
        //           title: "Suggested follow-up questions",
        //           result: JSON.stringify({ questions }),
        //           status: "success",
        //         },
        //       });
        //     }
        //   } catch (error) {
        //     console.error("[Stream] Error generating follow-up questions:", error);
        //   }
        // }

        closeTextBlock(writer);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "AbortError" ||
            error.message.toLowerCase().includes("abort"))
        ) {
          // Client disconnected — close gracefully
        } else {
          throw error;
        }
      } finally {
        closeTextBlock(writer);
      }
    },
    onError: (error: unknown) => {
      console.error("Stream finalization error:", error);
      if (
        error instanceof Error &&
        error.message.includes("401 No cookie auth credentials found")
      ) {
        return "Authentication failed: Please check your LLM API credentials";
      }
      return error instanceof Error
        ? error.message
        : "An unknown error occurred during stream finalization";
    },
    onFinish: async ({ messages, isContinuation }) => {
      if (callbacks?.onFinal && !isContinuation && streamWriter) {
        await callbacks.onFinal(messages, streamWriter);
      }
    },
  });
}

export async function writeResponseToStream(
  generator: AsyncIterable<ChatResponseChunk<object>>,
  sendEvent: (event: WorkflowEventData<unknown>) => void,
) {
  let response = "";
  if (generator) {
    for await (const chunk of generator) {
      response += chunk.delta;
      sendEvent(
        agentStreamEvent.with({
          delta: chunk.delta,
          response,
          currentAgentName: "LLM",
          raw: chunk.raw,
        }),
      );
    }
  }
  return response;
}
