import { isAdmin } from "@/app/lib/auth/auth";
import { checkIpBan } from "@/app/lib/ipBan";
import { db } from "@/db";
import { chatConversations } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check if IP is banned before processing request
    await checkIpBan(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const featuredParam = searchParams.get("featured");
    const isFeatured = featuredParam === "true";

    // Check if user is trying to access all conversations without being an admin
    if (!isFeatured) {
      const adminCheck = await isAdmin();
      if (!adminCheck) {
        return NextResponse.json(
          {
            error:
              "Unauthorized: Admin access required to view all conversations",
          },
          { status: 403 },
        );
      }
    }

    // Build conversations query with conditional where clause
    const conversationsQuery = db
      .select({
        uuid: chatConversations.uuid,
        title: chatConversations.title,
        updatedAt: chatConversations.updatedAt,
        mode: chatConversations.mode,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
        country: chatConversations.country,
      })
      .from(chatConversations)
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Build count query with conditional where clause
    const countQuery = db.select({ value: count() }).from(chatConversations);

    // Execute queries with conditional where clauses
    const [conversations, totalResult] = await Promise.all([
      isFeatured
        ? conversationsQuery.where(eq(chatConversations.featured, true))
        : conversationsQuery,
      isFeatured
        ? countQuery.where(eq(chatConversations.featured, true))
        : countQuery,
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
