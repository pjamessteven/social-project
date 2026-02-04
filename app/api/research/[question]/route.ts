import { db, detransQuestions } from "@/db";
import { eq } from "drizzle-orm";
import { locales } from "@/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

// Use locales from i18n routing configuration
const LOCALES = locales;
type Locale = (typeof LOCALES)[number];

interface QuestionData {
  name: string;
  finalResponse: string | null;
  viewsCount: number | null;
  mostRecentlyAsked: Date | null;
  createdAt: Date | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ question: string }> }
) {
  try {
    const { question } = await params;
    const questionName = decodeURIComponent(question);

    // Get question data from detrans_questions table
    const result = await db
      .select({
        name: detransQuestions.name,
        finalResponse: detransQuestions.finalResponse,
        viewsCount: detransQuestions.viewsCount,
        mostRecentlyAsked: detransQuestions.mostRecentlyAsked,
        createdAt: detransQuestions.createdAt,
      })
      .from(detransQuestions)
        .where(eq(detransQuestions.name, questionName))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ question: result[0] as QuestionData });
  } catch (error) {
    console.error("Error fetching research question:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 }
    );
  }
}

/*
//
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ question: string }> },
) {
  try {
    // Check admin authentication
    const { session, errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });

    if (errorResponse) {
      return errorResponse;
    }

    const { uuid } = await params;

    // Validate UUID parameter
    if (!uuid || typeof uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid conversation UUID" },
        { status: 400 },
      );
    }

    // Check if conversation exists
    const existingConversation = await db
      .select({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation:
          chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
        ipAddress: chatConversations.ipAddress,
      })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (!existingConversation[0]) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Delete the conversation
    await db.delete(chatConversations).where(eq(chatConversations.uuid, uuid));

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}
/*
// POST endpoint to ban a user by IP address
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ question: string }> },
) {
  try {
    // Check admin authentication
    const { session, errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });

    if (errorResponse) {
      return errorResponse;
    }

    const { uuid } = await params;

    // Validate UUID parameter
    if (!uuid || typeof uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid conversation UUID" },
        { status: 400 },
      );
    }

    // Check if conversation exists
    const existingConversation = await db
      .select({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation:
          chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
        ipAddress: chatConversations.ipAddress,
      })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (!existingConversation[0]) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const conversation = existingConversation[0];

    // Check if IP address exists
    if (!conversation.ipAddress) {
      return NextResponse.json(
        { error: "No IP address associated with this conversation" },
        { status: 400 },
      );
    }

    // Parse request body for ban reason
    const body = await request.json();
    const reason = body.reason || "Banned by admin";

    // Check if IP is already banned
    const existingBan = await db
      .select()
      .from(bannedUsers)
      .where(eq(bannedUsers.ipAddress, conversation.ipAddress))
      .limit(1);

    if (existingBan[0]) {
      return NextResponse.json(
        { error: "IP address is already banned" },
        { status: 400 },
      );
    }

    // Add IP to banned users table
    const bannedUser = await db
      .insert(bannedUsers)
      .values({
        ipAddress: conversation.ipAddress,
        reason,
        bannedBy: session?.user?.username || "admin",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "User banned successfully",
      bannedUser: bannedUser[0],
    });
  } catch (error) {
    console.error("Error banning user:", error);
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 });
  }
}
*/
