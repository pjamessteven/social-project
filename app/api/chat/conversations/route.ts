import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { chatConversations } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const conversations = await db
      .select({
        uuid: chatConversations.uuid,
        title: chatConversations.title,
        updatedAt: chatConversations.updatedAt,
        mode: chatConversations.mode,
      })
      .from(chatConversations)
      .orderBy(desc(chatConversations.updatedAt));

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching chat conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat conversations" },
      { status: 500 },
    );
  }
}
