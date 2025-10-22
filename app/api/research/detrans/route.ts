import { type UIMessage } from "ai";
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
} from "../utils";

// import workflow factory and settings from local file
import { incrementQuestionViews } from "@/app/lib/cache";
import { getIP } from "@/app/lib/getIp";
import { stopAgentEvent } from "@llamaindex/workflow";
import { initSettings } from "./app/settings";
import { workflowFactory } from "./app/workflow";

initSettings();

export async function POST(req: NextRequest) {
  try {
    const userIp = getIP(req);
    const reqBody = await req.json();
    const suggestNextQuestions = process.env.SUGGEST_NEXT_QUESTIONS === "true";

    console.log('reqbody', reqBody)
    const { messages, id: requestId } = reqBody as {
      messages: UIMessage[];
      id?: string;
    };
    const chatHistory = messages.map((message) => ({
      role: message.role as MessageType,
      content: message.parts,
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

    console.log('LAST MESSAGE', lastMessage)

    const abortController = new AbortController();
    req.signal.addEventListener("abort", () =>
      abortController.abort("Connection closed"),
    );

    const context = await runWorkflow({
      workflow: await workflowFactory(reqBody, userIp),
      input: { userInput: lastMessage.parts[0].text, chatHistory },
      human: {
        snapshotId: requestId, // use requestId to restore snapshot
        responses: getHumanResponsesFromMessage(lastMessage),
      },
    });
    incrementQuestionViews("detrans", lastMessage.content);

    // @ts-expect-error something
    const stream = processWorkflowStream(context.stream).until(
      // @ts-expect-error something
      (event) =>
        abortController.signal.aborted || stopAgentEvent.include(event),
    );

    const dataStream = toDataStream(stream, {
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
            await sendSuggestedQuestionsEvent(
              dataStreamWriter,
              chatHistory,
              "detrans",
              lastMessage.content,
            );
          }
        },
      },
    });
    return new Response(dataStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
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
