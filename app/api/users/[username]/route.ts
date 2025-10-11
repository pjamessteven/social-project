import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransUsers, detransComments, tags, userTags } from "../../../../db/schema";
import { eq, sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    const user = await db
      .select({
        username: detransUsers.username,
        activeSince: detransUsers.activeSince,
        sex: detransUsers.sex,
        experienceSummary: detransUsers.experienceSummary,
        experience: detransUsers.experience,
        redFlagsReport: detransUsers.redFlagsReport,
        commentCount: sql<number>`COALESCE(COUNT(DISTINCT ${detransComments.id}), 0)`,
      })
      .from(detransUsers)
      .leftJoin(detransComments, eq(detransUsers.username, detransComments.username))
      .where(eq(detransUsers.username, decodeURIComponent(username)))
      .groupBy(
        detransUsers.username,
        detransUsers.activeSince,
        detransUsers.sex,
        detransUsers.experienceSummary,
        detransUsers.experience,
        detransUsers.redFlagsReport
      )
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user tags
    const userTagsResult = await db
      .select({
        tagName: tags.name,
      })
      .from(userTags)
      .innerJoin(tags, eq(userTags.tagId, tags.id))
      .where(eq(userTags.username, decodeURIComponent(username)));

    const userWithTags = {
      ...user[0],
      tags: userTagsResult.map(t => t.tagName),
      commentCount: Number(user[0].commentCount)
    };

    return NextResponse.json({ user: userWithTags });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
