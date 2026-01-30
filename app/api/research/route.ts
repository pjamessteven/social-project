import { getCountryFromIP } from "@/app/lib/geolocation";
import { checkIpBan, getIpFromRequest } from "@/app/lib/ipBan";
import { incrementQuestionViews } from "@/app/lib/researchCacheHelpers";
import { db } from "@/db";
import { chatConversations, detransQuestions } from "@/db/schema";
import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { desc, eq, sql } from "drizzle-orm";
import { ChatMessage, type MessageType } from "llamaindex";

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
// import chat utils
import {
  pauseForHumanInput,
  processWorkflowStream,
  runWorkflow,
  toDataStream,
} from "./utils";

// import workflow factory and settings from local file
import { stopAgentEvent } from "@llamaindex/workflow";
import { initSettings } from "./app/settings";
import { workflowFactory } from "./app/workflow";

initSettings();

export async function POST(req: NextRequest) {
  try {
    // Check if IP is banned before processing request
    await checkIpBan(req);

    const reqBody = await req.json();
    const suggestNextQuestions = process.env.SUGGEST_NEXT_QUESTIONS === "true";

    console.log(
      "[DEEP RESEARCH API] Request body:",
      JSON.stringify(reqBody, null, 2),
    );

    const {
      messages,
      id: requestId,
      conversationId,
      locale,
    } = reqBody as {
      messages: UIMessage[];
      id?: string;
      conversationId?: string;
      locale?: string;
    };

    const ipAddress = getIpFromRequest(req);

    // Generate or use provided conversation UUID
    const chatUuid = conversationId || uuidv4();
    console.log(
      `[DEEP RESEARCH API] Using conversation UUID: ${chatUuid} (provided: ${conversationId})`,
    );

    // Check if conversation exists - deep research is single-message only
    if (chatUuid) {
      const existingConversation = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.uuid, chatUuid))
        .limit(1);

      if (existingConversation[0]) {
        const conversation = existingConversation[0];

        // Deep research only allows one message per conversation
        // If conversation exists and has messages, reject the request
        if (conversation.messages) {
          const parsedMessages = JSON.parse(conversation.messages);
          if (parsedMessages.length > 0) {
            return NextResponse.json(
              {
                error:
                  "This deep research session has already been completed. Please start a new research session.",
              },
              { status: 410 },
            );
          }
        }

        // Check if conversation is marked as archived/completed
        if (conversation.archived) {
          return NextResponse.json(
            {
              error:
                "This deep research session has been completed and is no longer available.",
            },
            { status: 410 },
          );
        }
      }
    }

    const chatHistory: ChatMessage[] = messages.map((message) => ({
      role: message.role as MessageType,
      content: message.parts[0].type === "text" ? message.parts[0].text : "", // message.parts[0]?
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

    // Track question in detrans_questions table for analytics
    if (userInput) {
      const questionName = userInput.slice(0, 255); // Truncate to fit varchar(255)
      await incrementQuestionViews(questionName);
    }

    const abortController = new AbortController();
    req.signal.addEventListener("abort", () =>
      abortController.abort("Connection closed"),
    );

    try {
      const context = await runWorkflow({
        workflow: await workflowFactory(reqBody, userInput, locale),
        input: { userInput: userInput }, // No chat history for deep research
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

      const dataStream = toDataStream(messages, stream, chatUuid, {
        callbacks: {
          onPauseForHumanInput: async (responseEvent) => {
            await pauseForHumanInput(context, responseEvent, requestId); // use requestId to save snapshot
          },

          onFinal: async (messages: UIMessage[], dataStreamWriter) => {
            await saveConversation(chatUuid, messages, ipAddress);

            /*
            if (suggestNextQuestions) {
              await sendSuggestedQuestionsEvent(
                dataStreamWriter,
                chatHistory,
                chatUuid,
              );
            }
             */
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
    console.error("Deep research handler error:", error);
    return NextResponse.json(
      {
        detail: (error as Error).message || "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Helper function to get localized field
function getLocalizedField(
  defaultValue: string | null,
  translationsJson: string | null,
  locale: string,
): string | null {
  if (!translationsJson) return defaultValue;

  try {
    const translations = JSON.parse(translationsJson) as Record<string, string>;
    return translations[locale] || defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;
    const locale = searchParams.get("locale") || "en";

    const featuredParam = searchParams.get("featured");
    const isFeatured = featuredParam === "true";

    console.log("API GET:", {
      featuredParam,
      isFeatured,
      page,
      limit,
      offset,
      locale,
    });

    // Allow all users to access all conversations
    // Removed admin check for unauthenticated users

    // Build conversations query with conditional where clause
    const conversationsQuery = db
      .select({
        uuid: chatConversations.uuid,
        title: chatConversations.title,
        titleTranslation: chatConversations.titleTranslation,
        updatedAt: chatConversations.updatedAt,
        mode: chatConversations.mode,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation:
          chatConversations.conversationSummaryTranslation,
        country: chatConversations.country,
      })
      .from(chatConversations)
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Build count query with conditional where clause
    const countQuery = db
      .select({ value: sql<number>`count(*)` })
      .from(chatConversations);

    // Execute queries with conditional where clauses
    const [conversations, totalResult] = await Promise.all([
      isFeatured
        ? conversationsQuery.where(eq(chatConversations.featured, true))
        : conversationsQuery,
      isFeatured
        ? countQuery.where(eq(chatConversations.featured, true))
        : countQuery,
    ]);

    console.log("API Response:", {
      isFeatured,
      count: conversations.length,
      featuredValues: conversations.map((c) => c.featured),
      total: totalResult[0].value,
    });

    // Localize conversations based on requested locale
    const localizedConversations = conversations.map((convo) => ({
      ...convo,
      title: getLocalizedField(convo.title, convo.titleTranslation, locale),
      conversationSummary: getLocalizedField(
        convo.conversationSummary,
        convo.conversationSummaryTranslation,
        locale,
      ),
    }));

    const total = totalResult[0].value;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      items: localizedConversations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching chat conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat conversations" },
      { status: 500 },
    );
  }
}

async function saveConversation(
  uuid: string,
  messages: UIMessage[],
  ipAddress?: string | null,
): Promise<void> {
  try {
    console.log(
      `[SAVE] Saving conversation ${uuid} with ${messages.length} messages`,
    );
    console.log(
      `[SAVE] Message roles: ${messages.map((m) => m.role).join(", ")}`,
    );

    // Get the first user message for question tracking
    const firstUserMessage = messages.find((m) => m.role === "user");
    console.log(
      `[SAVE] First user message:`,
      firstUserMessage
        ? {
            role: firstUserMessage.role,
            partsCount: firstUserMessage.parts?.length,
            firstPart: firstUserMessage.parts?.[0],
          }
        : "not found",
    );

    const questionText =
      firstUserMessage?.parts[0]?.type === "text"
        ? firstUserMessage.parts[0].text.slice(0, 255)
        : null;

    // Get the final assistant response
    const finalAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    console.log(
      `[SAVE] Final assistant message:`,
      finalAssistantMessage
        ? {
            role: finalAssistantMessage.role,
            partsCount: finalAssistantMessage.parts?.length,
            firstPart: finalAssistantMessage.parts?.[0],
          }
        : "not found",
    );

    const finalResponse =
      finalAssistantMessage?.parts[0]?.type === "text"
        ? finalAssistantMessage.parts[0].text
        : null;

    console.log(
      `[SAVE] questionText: "${questionText?.substring(0, 50)}...", finalResponse length: ${finalResponse?.length}`,
    );

    // Update detrans_questions with final response
    if (questionText && finalResponse) {
      try {
        console.log(`[SAVE] Inserting into detrans_questions...`);
        await db
          .insert(detransQuestions)
          .values({
            name: questionText,
            finalResponse: finalResponse,
            viewsCount: 1,
            mostRecentlyAsked: new Date(),
            createdAt: new Date(),
          })
          .onConflictDoUpdate({
            target: detransQuestions.name,
            set: {
              finalResponse: finalResponse,
              mostRecentlyAsked: new Date(),
            },
          });
        console.log(`[SAVE] Successfully saved to detrans_questions`);
      } catch (error) {
        console.error("[SAVE] Failed to update detrans_questions:", error);
        // Don't throw - analytics failures shouldn't break the application
      }
    } else {
      console.log(
        `[SAVE] Skipping detrans_questions update - missing questionText (${!!questionText}) or finalResponse (${!!finalResponse})`,
      );
    }

    // Get country from IP if available
    let country: string | null = null;
    if (ipAddress && ipAddress !== "unknown") {
      country = await getCountryFromIP(ipAddress);
    }

    // Validate IP address format
    const isValidIP =
      ipAddress &&
      ipAddress !== "unknown" &&
      !ipAddress.startsWith("192.168.") &&
      !ipAddress.startsWith("10.") &&
      ipAddress !== "127.0.0.1" &&
      ipAddress !== "::1";

    // Use the existing messages - they already include the assistant response from streaming
    const completeMessages = messages;
  } catch (error) {
    console.error("Failed to save deep research session:", error);
  }
}
