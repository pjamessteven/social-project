import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransUsers, detransComments, tags, userTags } from "../../../db/schema";
import { eq, and, like, sql, inArray } from "drizzle-orm";

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
      // Handle multiple tags separated by commas
      const tagNames = tag.split(',').map(t => t.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        // Get tag IDs for the requested tag names
        const tagIds = await db
          .select({ id: tags.id })
          .from(tags)
          .where(inArray(tags.name, tagNames));
        
        if (tagIds.length > 0) {
          // Find users who have ALL the requested tags
          const usersWithAllTags = await db
            .select({ username: userTags.username })
            .from(userTags)
            .where(inArray(userTags.tagId, tagIds.map(t => t.id)))
            .groupBy(userTags.username)
            .having(sql`COUNT(DISTINCT ${userTags.tagId}) = ${tagIds.length}`);
          
          if (usersWithAllTags.length > 0) {
            conditions.push(inArray(detransUsers.username, usersWithAllTags.map(u => u.username)));
          } else {
            // No users have all the requested tags, return empty result
            return NextResponse.json({
              users: [],
              pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
            });
          }
        }
      }
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
        commentCount: sql<number>`COALESCE(COUNT(DISTINCT ${detransComments.id}), 0)`,
      })
      .from(detransUsers)
      .leftJoin(detransComments, eq(detransUsers.username, detransComments.username))
      .where(whereClause)
      .groupBy(
        detransUsers.username,
        detransUsers.activeSince,
        detransUsers.sex,
        detransUsers.experienceSummary
      )
      .orderBy(sql`COALESCE(COUNT(DISTINCT ${detransComments.id}), 0) DESC`)
      .limit(limit)
      .offset((page - 1) * limit);

    // Get tags for all users in this page
    const usernames = users.map(u => u.username);
    const allUserTags = usernames.length > 0 ? await db
      .select({
        username: userTags.username,
        tagName: tags.name,
      })
      .from(userTags)
      .innerJoin(tags, eq(userTags.tagId, tags.id))
      .where(inArray(userTags.username, usernames)) : [];

    // Group tags by username
    const tagsByUsername = allUserTags.reduce((acc, { username, tagName }) => {
      if (!acc[username]) acc[username] = [];
      acc[username].push(tagName);
      return acc;
    }, {} as Record<string, string[]>);

    // Combine users with their tags
    const usersWithTags = users.map(user => ({
      ...user,
      tags: tagsByUsername[user.username] || [],
      commentCount: Number(user.commentCount)
    }));

    return NextResponse.json({
      users: usersWithTags,
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
