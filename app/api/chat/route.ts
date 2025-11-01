import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { ChatMessage, type MessageType } from "llamaindex";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { chatConversations, db } from "@/db";
import { eq } from "drizzle-orm";

// import chat utils
import {
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

    console.log("[CHAT API] Request body:", JSON.stringify(reqBody, null, 2));
    
    const { messages, id: requestId, conversationId } = reqBody as {
      messages: UIMessage[];
      id?: string;
      conversationId?: string;
    };

    // Generate or use provided conversation UUID
    const chatUuid = conversationId || uuidv4();
    console.log(`[CHAT API] Using conversation UUID: ${chatUuid} (provided: ${conversationId})`);

    // Check if conversation exists and is archived (older than 30 minutes)
    if (chatUuid) {
      const existingConversation = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.uuid, chatUuid))
        .limit(1);

      if (existingConversation[0]) {
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
        const lastUpdated = existingConversation[0].updatedAt.getTime();
        
        if (lastUpdated < thirtyMinutesAgo) {
          return NextResponse.json(
            { error: "This conversation has been archived and is no longer available for new messages." },
            { status: 410 }
          );
        }
      }
    }

    const chatHistory: ChatMessage[] = messages.map((message) => ({
      role: message.role as MessageType,
      content: message.parts[0].type === "text" ? message.parts[0].text : "", // mmessage.parts[0]?
    }));
    console.log("Chat history:", chatHistory);

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

    try {
            console.log('3rocesstream')

      const context = await runWorkflow({
        workflow: await workflowFactory(reqBody, userInput, chatUuid),
        input: { userInput: userInput, chatHistory },
        human: {
          snapshotId: requestId, // use requestId to restore snapshot
        },
      });


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

            // Save complete conversation to database
            await saveConversation(chatUuid, messages);

            if (suggestNextQuestions && completion.length > 500) {
              await sendSuggestedQuestionsEvent(dataStreamWriter, chatHistory, chatUuid);
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
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
          "X-Conversation-Id": chatUuid, // Return the conversation ID in headers
        },
      });
    } catch (workflowError) {
      console.error("Workflow execution error:", workflowError);
      // Re-throw to be caught by outer catch block
      throw workflowError;
    }
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

async function saveConversation(
  uuid: string,
  messages: UIMessage[],
): Promise<void> {
  try {
    // Use the existing messages - they already include the assistant response from streaming
    const completeMessages = messages;

    // Generate a title from the first user message (truncated)
    const firstUserMessage = messages.find(m => m.role === "user");
    const title = firstUserMessage?.parts[0]?.type === "text" 
      ? firstUserMessage.parts[0].text.substring(0, 100) + (firstUserMessage.parts[0].text.length > 100 ? "..." : "")
      : "Chat conversation";

    // Save or update the conversation in the database
    await db
      .insert(chatConversations)
      .values({
        uuid,
        mode: "detrans_chat",
        title,
        messages: JSON.stringify(completeMessages),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chatConversations.uuid,
        set: {
          title,
          messages: JSON.stringify(completeMessages),
          updatedAt: new Date(),
        },
      });

    console.log(`Saved conversation ${uuid} with ${completeMessages.length} messages`);
  } catch (error) {
    console.error("Failed to save conversation:", error);
    // Don't throw - conversation saving failures shouldn't break the chat
  }
}
