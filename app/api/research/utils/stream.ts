import {
  agentStreamEvent,
  toolCallsEvent,
  toolResultsEvent,
  type WorkflowEvent,
  type WorkflowEventData,
} from "@llamaindex/workflow";
import { createUIMessageStream, UIMessage, UIMessageStreamWriter } from "ai";
import { randomUUID } from "crypto";
import type { ChatResponseChunk } from "llamaindex";
import { humanInputEvent, type HumanResponseEventData } from "./hitl";
import { generatePhilosophicalQuote } from "./philosophicalQuote";

/**
 * Configuration options and helper callback methods for stream lifecycle events.
 */
export interface StreamCallbacks {
  /** `onStart`: Called once when the stream is initialized. */
  onStart?: (dataStreamWriter: UIMessageStreamWriter) => Promise<void> | void;

  /** `onComplete`: Called after stream processing completes but before stream closes. Useful for sending final data annotations. */
  onComplete?: (dataStreamWriter: UIMessageStreamWriter) => Promise<void> | void;

  /** `onFinal`: Called once when the stream is closed with the final completion message. */
  onFinal?: (messages: UIMessage[], dataStreamWriter: UIMessageStreamWriter) => Promise<void> | void;

  /** `onText`: Called for each text chunk. */
  onText?: (
    text: string,
    dataStreamWriter: UIMessageStreamWriter,
  ) => Promise<void> | void;

  /** `onPauseForHumanInput`: Called when human input event is emitted. */
  onPauseForHumanInput?:
    | ((event: WorkflowEvent<HumanResponseEventData>) => Promise<void> | void)
    | undefined;
}

/**
 * Convert a stream of WorkflowEventData to a Response object.
 * @param stream - The input stream of WorkflowEventData.
 * @param options - Optional options for stream lifecycle events.
 * @returns A readable stream of data.
 */
export function toDataStream(
  originalMessages: UIMessage[],
  stream: AsyncIterable<WorkflowEventData<unknown>>,
  conversationId: string,
  options: {
    callbacks?: StreamCallbacks;
  } = {},
) {
  const { callbacks } = options;

  let completionText = "";
  let hasStarted = false;
  let textId: string | null = null;
  let streamWriter: UIMessageStreamWriter | null = null;

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
          if (agentStreamEvent.include(event) && event.data.delta) {
            const content = event.data.delta;
            if (content) {
              // Start text block if not already started
              if (!textId) {
                textId = `text-${randomUUID()}`;
                console.log("TEXTID", textId);
                writer.write({
                  type: "text-start",
                  id: textId,
                });
              }

              completionText += content;
              writer.write({
                type: "text-delta",
                id: textId,
                delta: content,
              });

              if (callbacks?.onText) {
                await callbacks.onText(content, writer);
              }
            }
          }
          
          if (humanInputEvent.include(event)) {
            const { response, ...rest } = event.data;
            writer.write({
              type: "data-annotation",
              data: rest,
            });
            if (callbacks?.onPauseForHumanInput) {
              await callbacks.onPauseForHumanInput(response);
              return; // stop the stream
            }
          } else if (agentStreamEvent.include(event) && !event.data.delta) {
            writer.write({
              type: "data-annotation",
              data: event.data,
            });
          }
          
          if (!agentStreamEvent.include(event)) {
            // console.log('EEVENT" NON AGENTSTREAMEVENT', JSON.stringify(event))
          }

          if (toolCallsEvent.include(event)) {
            for (const toolCall of event.data.toolCalls) {
              writer.write({
                type:
                  toolCall.toolName === "queryVideos"
                    ? "data-video-query-event"
                    : toolCall.toolName === "queryStories"
                      ? "data-story-query-event"
                      : "data-comment-query-event",
                id: toolCall.toolId,
                data: {
                  title:
                    toolCall.toolName === "queryVideos"
                      ? "Querying videos..."
                      : toolCall.toolName === "queryStories"
                        ? "Querying user stories..."
                        : "Querying user comments...",
                  query: toolCall.toolKwargs.query,
                },
              });
            }
          }
          if (toolResultsEvent.include(event)) {
            if (textId) {
              writer.write({
                type: "text-end",
                id: textId,
              });
              textId = null;
            }
            for (const toolResult of event.data.results) {
              writer.write({
                type:
                  toolResult.toolName === "queryVideos"
                    ? "data-video-query-event"
                    : toolResult.toolName === "queryStories"
                      ? "data-story-query-event"
                      : "data-comment-query-event",
                id: toolResult.toolId,
                data: {
                  title:
                    toolResult.toolName === "queryVideos"
                      ? "Queried user videos"
                      : toolResult.toolName === "queryStories"
                        ? "Queried user stories"
                        : "Queried user comments",
                  query: toolResult.toolKwargs.query,
                  result: toolResult.raw,
                  status: toolResult.toolOutput.isError ? "error" : "success",
                },
              });
            }
          }
        }

        // End text block if it was started
        if (textId) {
          writer.write({
            type: "text-end",
            id: textId,
          });
        }

        // Call onComplete callback after main content is done but before stream closes
        // This is the right time to send data annotations like suggested questions
        if (callbacks?.onComplete) {
          console.log(`[STREAM] Calling onComplete callback`);
          await callbacks.onComplete(writer);
        }

        if (completionText.length > 500 && false) {
          try {
            const philosophicalQuote = await generatePhilosophicalQuote(
              completionText,
              conversationId,
            );

            if (philosophicalQuote) {
              // Start a new text block for the quote
              const quoteId = `text-${randomUUID()}`;
              writer.write({
                type: "text-start",
                id: quoteId,
              });

              // Write the quote with some formatting
              const formattedQuote = `\n\n---\n\n> ${philosophicalQuote}\n\n---\n`;
              writer.write({
                type: "text-delta",
                id: quoteId,
                delta: formattedQuote,
              });

              // End the quote text block
              writer.write({
                type: "text-end",
                id: quoteId,
              });

              // Update completion text to include the quote
              completionText += formattedQuote;
            }
          } catch (error) {
            console.error("Failed to generate philosophical quote:", error);
            // Don't let quote generation failure break the stream
          }
        }
      } catch (streamError) {
        console.error("Stream processing error:", streamError);

        // Re-throw other errors to be handled by onError
        throw streamError;
      }
    },
    onError: (error: unknown) => {
      console.error("Stream finalization error:", error);

      // Handle specific LLM authentication errors
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
      console.log(`[STREAM] onFinish called with ${messages.length} messages, isContinuation: ${isContinuation}`);
      console.log(`[STREAM] Message details:`, messages.map(m => ({
        role: m.role,
        partsCount: m.parts?.length,
        firstPartType: m.parts?.[0]?.type,
        firstPartTextLength: m.parts?.[0]?.type === 'text' ? (m.parts[0] as any).text?.length : 0
      })));
      
      // Call onFinal with the complete text when stream ends
      if (callbacks?.onFinal && !isContinuation && streamWriter) {
        console.log(`[STREAM] Calling onFinal callback`);
        await callbacks.onFinal(messages, streamWriter);
      } else {
        console.log(`[STREAM] Skipping onFinal - callbacks: ${!!callbacks?.onFinal}, isContinuation: ${isContinuation}, streamWriter: ${!!streamWriter}`);
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
