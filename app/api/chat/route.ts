import { type Message } from "ai";
import { type MessageType } from "llamaindex";
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
      messages: Message[];
      id?: string;
    };
    const chatHistory = messages.map((message) => ({
      role: message.role as MessageType,
      content: message.content,
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

    const abortController = new AbortController();
    req.signal.addEventListener("abort", () =>
      abortController.abort("Connection closed"),
    );

    console.log('[ROUTE] About to run workflow...');
    const context = await runWorkflow({
      workflow: await workflowFactory(reqBody || {}),
      input: { userInput: lastMessage.content, chatHistory },
      human: {
        snapshotId: requestId, // use requestId to restore snapshot
        responses: getHumanResponsesFromMessage(lastMessage),
      },
    });
    console.log('[ROUTE] Workflow completed, context received');
    console.log('[ROUTE] Context keys:', Object.keys(context));
    console.log('[ROUTE] Context.stream type:', typeof context.stream);
    console.log('[ROUTE] Context.stream:', context.stream);
    
    try {
      console.log('[ROUTE] Attempting to stringify context...');
      const contextStr = JSON.stringify(context);
      console.log('[ROUTE] Context stringified successfully, length:', contextStr.length);
    } catch (stringifyError) {
      console.error('[ROUTE] Error stringifying context:', stringifyError);
      console.log('[ROUTE] Context structure inspection:');
      for (const [key, value] of Object.entries(context)) {
        console.log(`[ROUTE] - ${key}:`, typeof value, value);
      }
    }

    console.log('[ROUTE] About to process workflow stream...');
        // @ts-expect-error something
    const stream = processWorkflowStream(context.stream).until(
          // @ts-expect-error something
      (event) => {
        console.log('[ROUTE] Stream event check:', typeof event, event);
        return abortController.signal.aborted || stopAgentEvent.include(event);
      },
    );
    console.log('[ROUTE] Stream processed successfully');

    console.log('[ROUTE] About to create data stream...');
    const dataStream = toDataStream(stream, {
      callbacks: {
        onPauseForHumanInput: async (responseEvent) => {
          console.log('[ROUTE] onPauseForHumanInput callback triggered');
          await pauseForHumanInput(context, responseEvent, requestId); // use requestId to save snapshot
        },
        onFinal: async (completion, dataStreamWriter) => {
          console.log('[ROUTE] onFinal callback triggered, completion length:', completion?.length);
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
    console.log('[ROUTE] Data stream created successfully');
    console.log('[ROUTE] About to return response...');
    return new Response(dataStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (error) {
    console.error("[ROUTE] Chat handler error:", error);
    console.error("[ROUTE] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("[ROUTE] Error name:", error instanceof Error ? error.name : 'Unknown error type');
    return NextResponse.json(
      {
        detail: (error as Error).message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
