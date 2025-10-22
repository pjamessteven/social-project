import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { ChatMessage, type MessageType } from "llamaindex";
import { NextRequest, NextResponse } from "next/server";

// import chat utils
import {
  getHumanResponsesFromMessage,
  pauseForHumanInput,
  processWorkflowStream,
  runWorkflow,
  sendSuggestedQuestionsEvent,
  toDataStream,
} from "./utils";

// import workflow factory and settings from local file
import { stopAgentEvent } from "@llamaindex/workflow";
import { initSettings } from "./app/settings";
import { workflowFactory } from "./app/workflow";

initSettings();

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    const suggestNextQuestions = process.env.SUGGEST_NEXT_QUESTIONS === "true";

    const { messages, id: requestId } = reqBody as {
      messages: UIMessage[];
      id?: string;
    };
    const chatHistory: ChatMessage[] = messages.map((message) => ({
      role: message.role as MessageType,
      content: message.parts[0].type === "text" ? message.parts[0].text : "", // mmessage.parts[0]?
    }));


    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "user") {
      return NextResponse.json(
        {
          detail: "Messages cannot be empty and last message must be from user",
        },
        { status: 400 },
      );
    }


    const userInput =
      lastMessage.parts[0].type === "text" ? lastMessage.parts[0].text : "";


    const abortController = new AbortController();
    req.signal.addEventListener("abort", () =>
      abortController.abort("Connection closed"),
    );

    const context = await runWorkflow({
      workflow: await workflowFactory(reqBody || {}),
      input: { userInput, chatHistory },
      human: {
        snapshotId: requestId, // use requestId to restore snapshot
       responses: getHumanResponsesFromMessage(lastMessage),
      },
    });
        // @ts-expect-error something
    const stream = processWorkflowStream(context.stream).until(
          // @ts-expect-error something
      (event) => {
        return abortController.signal.aborted || stopAgentEvent.include(event);
      },
    );

    // Wrap the stream to handle malformed JSON
    const wrappedStream = (async function* () {
      for await (const event of stream) {
        // Ensure event data is properly serialized
        if (event && typeof event === 'object') {
          try {
            // Test serialization and catch any undefined concatenation issues
            const serialized = JSON.stringify(event);
            if (serialized.includes('undefined{')) {
              console.warn('Detected malformed JSON with undefined prefix, attempting to fix');
              // Skip this event or try to fix it
              continue;
            }
            yield event;
          } catch (error) {
            console.error('Error serializing event:', error);
            // Skip malformed events
            continue;
          }
        } else {
          yield event;
        }
      }
    })();

    const dataStream = toDataStream(wrappedStream, {
      callbacks: {
        onPauseForHumanInput: async (responseEvent) => {
          await pauseForHumanInput(context, responseEvent, requestId); // use requestId to save snapshot
        },
        onFinal: async (completion, dataStreamWriter) => {
          chatHistory.push({
            role: "assistant" as MessageType,
            content: completion,
          });
          if (suggestNextQuestions) {
           // await sendSuggestedQuestionsEvent(dataStreamWriter, chatHistory);
          }
        },
      },
    });
    
    return createUIMessageStreamResponse({
      stream: dataStream, 
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (error) {
    console.error("Chat handler error:", error);
    return NextResponse.json(
      {
        detail: (error as Error).message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
