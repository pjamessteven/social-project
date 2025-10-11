import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransComments } from "../../../../../db/schema";
import { eq, desc } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log("Fetching comments for username:", username);

    const comments = await db
      .select({
        id: detransComments.id,
        text: detransComments.text,
        score: detransComments.score,
        created: detransComments.created,
        link: detransComments.link,
        subreddit: detransComments.subreddit,
        questions: detransComments.questions,
        summary: detransComments.summary,
      })
      .from(detransComments)
      .where(eq(detransComments.username, decodeURIComponent(username)))
      .orderBy(desc(detransComments.score))
      .limit(limit)
      .offset(offset);

    console.log("Found comments:", comments?.length || 0);

    // Ensure we always return an array, even if comments is null/undefined
    const safeComments = Array.isArray(comments) ? comments : [];

    return NextResponse.json({ comments: safeComments });
  } catch (error) {
    console.error("Error fetching user comments:", error);
    // Make sure error is safely serializable
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch comments", details: errorMessage, comments: [] },
      { status: 500 }
    );
  }
}
