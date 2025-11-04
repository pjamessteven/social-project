import { NextRequest, NextResponse } from "next/server";
import { chatConversations } from "@/db/schema";
import { desc, count } from "drizzle-orm";
import { db } from "@/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const conversationsPromise = db
      .select({
        uuid: chatConversations.uuid,
        title: chatConversations.title,
        updatedAt: chatConversations.updatedAt,
        mode: chatConversations.mode,
        messages: chatConversations.messages,
      })
      .from(chatConversations)
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit)
      .offset(offset);

    const totalPromise = db.select({ value: count() }).from(chatConversations);

    const [conversations, totalResult] = await Promise.all([
      conversationsPromise,
      totalPromise,
    ]);

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
