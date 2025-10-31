import { NextRequest, NextResponse } from "next/server";
import { chatConversations, db } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    if (!uuid) {
      return NextResponse.json(
        { error: "UUID parameter is required" },
        { status: 400 }
      );
    }

    // Retrieve the conversation from the database
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
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
        { status: 500 }
      );
    }

    return NextResponse.json({
      uuid: chatData.uuid,
      mode: chatData.mode,
      title: chatData.title,
      messages,
      createdAt: chatData.createdAt,
      updatedAt: chatData.updatedAt,
    });

  } catch (error) {
    console.error("Failed to retrieve conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
