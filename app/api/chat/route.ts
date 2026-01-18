import { getCountryFromIP } from "@/app/lib/geolocation";
import { checkIpBan, getIpFromRequest } from "@/app/lib/ipBan";
import { db } from "@/db";
import { chatConversations } from "@/db/schema";
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

    console.log("[CHAT API] Request body:", JSON.stringify(reqBody, null, 2));

    const {
      messages,
      id: requestId,
      conversationId,
    } = reqBody as {
      messages: UIMessage[];
      id?: string;
      conversationId?: string;
    };

    const ipAddress = getIpFromRequest(req);

    // Generate or use provided conversation UUID
    const chatUuid = conversationId || uuidv4();
    console.log(
      `[CHAT API] Using conversation UUID: ${chatUuid} (provided: ${conversationId})`,
    );

    // Check if conversation exists and is archived
    if (chatUuid) {
      const existingConversation = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.uuid, chatUuid))
        .limit(1);

      if (existingConversation[0]) {
        const conversation = existingConversation[0];

        // Check if conversation is marked as archived
        if (conversation.archived) {
          return NextResponse.json(
            {
              error:
                "This conversation has been archived and is no longer available for new messages.",
            },
            { status: 410 },
          );
        }

        // Auto-archive conversations older than 30 minutes
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        const lastUpdated = conversation.updatedAt.getTime();

        if (lastUpdated < thirtyMinutesAgo) {
          // Mark conversation as archived
          await db
            .update(chatConversations)
            .set({ archived: true })
            .where(eq(chatConversations.uuid, chatUuid));

          return NextResponse.json(
            {
              error:
                "This conversation has been archived and is no longer available for new messages.",
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

    const abortController = new AbortController();
    req.signal.addEventListener("abort", () =>
      abortController.abort("Connection closed"),
    );

    try {
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

      const dataStream = toDataStream(messages, stream, chatUuid, {
        callbacks: {
          onPauseForHumanInput: async (responseEvent) => {
            await pauseForHumanInput(context, responseEvent, requestId); // use requestId to save snapshot
          },
          onFinal: async (messages: UIMessage[]) => {
            await saveConversation(chatUuid, messages, ipAddress);
            /*
            if (suggestNextQuestions && completion.length > 500) {
              await sendSuggestedQuestionsEvent(dataStreamWriter, chatHistory, chatUuid);
            }*/
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const featuredParam = searchParams.get("featured");
    const isFeatured = featuredParam === "true";

    console.log("API GET:", { featuredParam, isFeatured, page, limit, offset });

    // Allow all users to access all conversations
    // Removed admin check for unauthenticated users

    // Build conversations query with conditional where clause
    const conversationsQuery = db
      .select({
        uuid: chatConversations.uuid,
        title: chatConversations.title,
        updatedAt: chatConversations.updatedAt,
        mode: chatConversations.mode,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        conversationSummary: chatConversations.conversationSummary,
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

    const total = totalResult[0].value;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      items: conversations,
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

    // Check if conversation already exists to preserve existing data
    const existingConversation = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    const existing = existingConversation[0];

    // Generate a default title from the first user message (truncated)
    const firstUserMessage = messages.find((m) => m.role === "user");
    const defaultTitle =
      firstUserMessage?.parts[0]?.type === "text"
        ? firstUserMessage.parts[0].text.substring(0, 100) +
          (firstUserMessage.parts[0].text.length > 100 ? "..." : "")
        : "Chat conversation";

    // Prepare update data
    const updateData: any = {
      messages: JSON.stringify(completeMessages),
      updatedAt: new Date(),
      archived: false, // Reset archived flag when conversation is updated
    };

    // Set country if we have it (always update country when we have new info)
    if (country) {
      updateData.country = country;
    }

    // Set IP address if we have a valid IP and it's not already set
    if (isValidIP && !existing?.ipAddress) {
      updateData.ipAddress = ipAddress;
    }

    // Preserve existing fields if they exist
    if (existing) {
      if (existing.mode !== undefined) {
        updateData.mode = existing.mode;
      }
      if (existing.featured !== undefined) {
        updateData.featured = existing.featured;
      }
      if (existing.archived !== undefined) {
        updateData.archived = existing.archived;
      }
      if (existing.conversationSummary !== undefined) {
        updateData.conversationSummary = existing.conversationSummary;
      }
      if (existing.createdAt !== undefined) {
        updateData.createdAt = existing.createdAt;
      }
      if (existing.title !== undefined && existing.title !== null) {
        updateData.title = existing.title;
      } else {
        updateData.title = defaultTitle;
      }
      // Preserve existing IP address if we have one
      if (existing.ipAddress !== undefined) {
        updateData.ipAddress = existing.ipAddress;
      }
    } else {
      updateData.title = defaultTitle;
      // Set country and IP address for new conversations
      if (country) {
        updateData.country = country;
      }
      if (isValidIP) {
        updateData.ipAddress = ipAddress;
      }
    }

    // Save or update the conversation in the database
    await db
      .insert(chatConversations)
      .values({
        uuid,
        mode: "detrans_chat",
        title: updateData.title,
        messages: JSON.stringify(completeMessages),
        featured: false,
        archived: false,
        country: updateData.country || null,
        ipAddress: updateData.ipAddress || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chatConversations.uuid,
        set: updateData,
      });

    console.log(
      `Saved conversation ${uuid} with ${completeMessages.length} messages, country: ${country || "null"}, ip: ${isValidIP ? ipAddress : "not saved"}`,
    );
  } catch (error) {
    console.error("Failed to save conversation:", error);
    // Don't throw - conversation saving failures shouldn't break the chat
  }
}
