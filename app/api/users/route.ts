import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransUsers, detransComments } from "../../../db/schema";
import { eq, and, like, sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sex = searchParams.get("sex");
    const tag = searchParams.get("tag");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validate parameters
    if (page < 1) {
      return NextResponse.json({ error: "Page must be >= 1" }, { status: 400 });
    }

    // Build where conditions
    const conditions = [];
    
    if (sex && (sex === "m" || sex === "f")) {
      conditions.push(eq(detransUsers.sex, sex));
    }
    
    if (tag) {
      // Search for tag in JSON array
      conditions.push(sql`${detransUsers.tags}::text LIKE ${`%"${tag}"%`}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(detransUsers)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;

    // Get paginated users with comment count
    const users = await db
      .select({
        username: detransUsers.username,
        activeSince: detransUsers.activeSince,
        sex: detransUsers.sex,
        experienceSummary: detransUsers.experienceSummary,
        tags: detransUsers.tags,
        commentCount: sql<number>`COALESCE(COUNT(${detransComments.id}), 0)`,
      })
      .from(detransUsers)
      .leftJoin(detransComments, eq(detransUsers.username, detransComments.username))
      .where(whereClause)
      .groupBy(
        detransUsers.username,
        detransUsers.activeSince,
        detransUsers.sex,
        detransUsers.experienceSummary,
        detransUsers.tags
      )
      .orderBy(sql`${detransUsers.activeSince} DESC`)
      .limit(limit)
      .offset((page - 1) * limit);

    // Parse tags for each user
    const usersWithParsedTags = users.map(user => ({
      ...user,
      tags: user.tags ? JSON.parse(user.tags) : [],
      commentCount: Number(user.commentCount)
    }));

    return NextResponse.json({
      users: usersWithParsedTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
