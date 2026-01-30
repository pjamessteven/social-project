import { requireAuth } from "@/app/lib/auth/middleware";
import { checkIpBan } from "@/app/lib/ipBan";
import { bannedUsers, chatConversations, db } from "@/db";
import { locales } from "@/i18n/routing";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Use locales from i18n routing configuration
const LOCALES = locales;
type Locale = (typeof LOCALES)[number];

// Also support GET for retrieving a single conversation

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    // Check if IP is banned before processing request
    await checkIpBan(request);

    const { uuid } = await params;

    if (!uuid) {
      return NextResponse.json(
        { error: "UUID parameter is required" },
        { status: 400 },
      );
    }

    // Retrieve the conversation from the database
    const conversation = await db
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
      })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const chatData = conversation[0];

    // Parse the messages JSON
    let messages;
    try {
      messages = JSON.parse(chatData.messages);
    } catch (error) {
      console.error("Failed to parse messages JSON:", error);
      return NextResponse.json(
        { error: "Invalid conversation data" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      uuid: chatData.uuid,
      mode: chatData.mode,
      title: chatData.title,
      messages,
      featured: chatData.featured,
      archived: chatData.archived,
      conversationSummary: chatData.conversationSummary,
      createdAt: chatData.createdAt,
      updatedAt: chatData.updatedAt,
    });
  } catch (error) {
    console.error("Failed to retrieve conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE endpoint to delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
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

// POST endpoint to ban a user by IP address
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
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
