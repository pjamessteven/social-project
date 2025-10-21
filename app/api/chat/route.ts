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
        console.log('[ROUTE] Stream event check:', typeof event);
        try {
          console.log('[ROUTE] Event toString():', event.toString());
        } catch (e) {
          console.error('[ROUTE] Error in event.toString():', e);
        }
        try {
          console.log('[ROUTE] Event toJSON():', event.toJSON());
        } catch (e) {
          console.error('[ROUTE] Error in event.toJSON():', e);
        }
        try {
          console.log('[ROUTE] Event data:', event.data);
        } catch (e) {
          console.error('[ROUTE] Error accessing event.data:', e);
        }
        return abortController.signal.aborted || stopAgentEvent.include(event);
      },
    );
    console.log('[ROUTE] Stream processed successfully');

    console.log('[ROUTE] About to create data stream...');
    
    // Override JSON.parse temporarily to catch the problematic call
    const originalJSONParse = JSON.parse;
    JSON.parse = function(text: string, reviver?: any) {
      console.log('[JSON.parse] Called with text type:', typeof text);
      console.log('[JSON.parse] Text preview:', typeof text === 'string' ? text.substring(0, 100) : text);
      
      if (typeof text === 'string' && text.startsWith('undefined{')) {
        console.error('[JSON.parse] FOUND THE PROBLEM! Text starts with "undefined{"');
        console.error('[JSON.parse] Full problematic text:', text);
        console.error('[JSON.parse] Stack trace:', new Error().stack);
        // Try to fix it by removing the "undefined" prefix
        const fixedText = text.replace(/^undefined/, '');
        console.log('[JSON.parse] Attempting to parse fixed text:', fixedText.substring(0, 100));
        return originalJSONParse.call(this, fixedText, reviver);
      }
      
      return originalJSONParse.call(this, text, reviver);
    };
    
    // Wrap the stream to catch JSON parsing errors
    const wrappedStream = (async function* () {
      try {
        for await (const event of stream) {
          console.log('[ROUTE] Processing stream event in dataStream wrapper');
          try {
            // Test if the event can be safely serialized
            const testSerialization = JSON.stringify(event);
            console.log('[ROUTE] Event serialization test passed, length:', testSerialization.length);
          } catch (serializationError) {
            console.error('[ROUTE] Event serialization failed:', serializationError);
            console.log('[ROUTE] Problematic event:', event);
          }
          console.log('event', event)
          console.log('json event', JSON.stringify(event))
          yield event;
        }
      } catch (streamError) {
        console.error('[ROUTE] Error in stream iteration:', streamError);
        throw streamError;
      }
    })();
    
    let dataStream;
    try {
      dataStream = toDataStream(wrappedStream, {
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
    } catch (dataStreamError) {
      console.error('[ROUTE] Error creating data stream:', dataStreamError);
      throw dataStreamError;
    } finally {
      // Restore original JSON.parse
      JSON.parse = originalJSONParse;
    }
    console.log('[ROUTE] About to return response...');
    
    // Restore JSON.parse in case it wasn't restored in the finally block
    JSON.parse = originalJSONParse;
    
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
