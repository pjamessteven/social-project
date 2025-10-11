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

    const comments = await db
      .select()
      .from(detransComments)
      .where(eq(detransComments.username, decodeURIComponent(username)))
      .orderBy(desc(detransComments.score))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching user comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
