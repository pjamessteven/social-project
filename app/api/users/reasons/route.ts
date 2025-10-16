import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq, and, inArray } from "drizzle-orm";
import postgres from "postgres";
import { detransUsers, detransTags, detransTagTypes, detransUserTags } from "@/db/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minAge = parseInt(searchParams.get("minAge") || "10");
    const maxAge = parseInt(searchParams.get("maxAge") || "50");
    const sex = searchParams.get("sex");
    const tag = searchParams.get("tag");
    const mode = searchParams.get("mode");

    const type = mode === 'detransition' ? 'detransition reason' : 'transition reason'
    
    // Build where conditions for tag types
    const tagConditions = [eq(detransTagTypes.type, type)];
    
    // Build where conditions for users
    const userConditions = [];
    if (sex && (sex === "m" || sex === "f")) {
      userConditions.push(eq(detransUsers.sex, sex));
    }

    // Add age filtering only for users who have a transition_age specified
    if (minAge) {
      userConditions.push(sql`(${detransUsers.transitionAge} IS NULL OR ${detransUsers.transitionAge} >= ${minAge})`);
    }
    if (maxAge) {
      userConditions.push(sql`(${detransUsers.transitionAge} IS NULL OR ${detransUsers.transitionAge} <= ${maxAge})`);
    }

    // Add tag filtering
    if (tag) {
      const tagNames = tag.split(',').map(t => t.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        // Get tag IDs for the requested tag names
        const tagIds = await db
          .select({ id: detransTags.id })
          .from(detransTags)
          .where(inArray(detransTags.name, tagNames));
        
        if (tagIds.length > 0) {
          // Find users who have ALL the requested tags
          const usersWithAllTags = await db
            .select({ username: detransUserTags.username })
            .from(detransUserTags)
            .where(inArray(detransUserTags.tagId, tagIds.map(t => t.id)))
            .groupBy(detransUserTags.username)
            .having(sql`COUNT(DISTINCT ${detransUserTags.tagId}) = ${tagIds.length}`);
          
          if (usersWithAllTags.length > 0) {
            userConditions.push(sql`${detransUsers.username} IN (${sql.join(usersWithAllTags.map(u => sql`${u.username}`), sql`, `)})`);
          } else {
            // No users have all the requested tags, return empty result
            return NextResponse.json({ 
              data: [],
              total: 0 
            });
          }
        }
      }
    }

    // Get all reason tags with filtered user counts
    const reasonField = mode === 'detransition' ? detransUsers.detransitionReasonId : detransUsers.transitionReasonId;
    
    // Build the user filter condition for the COUNT
    let userFilterCondition = sql`1=1`;
    if (userConditions.length > 0) {
      userFilterCondition = and(...userConditions) || sql`1=1`;
    }
    
    const detransitionReasons = await db
      .select({
        id: detransTags.id,
        name: detransTags.name,
        userCount: sql<number>`COALESCE(COUNT(DISTINCT CASE WHEN ${reasonField} = ${detransTags.id} AND ${userFilterCondition} THEN ${detransUsers.username} END), 0)`,
      })
      .from(detransTags)
      .innerJoin(detransTagTypes, eq(detransTags.id, detransTagTypes.tagId))
      .leftJoin(detransUsers, sql`1=1`)
      .where(and(...tagConditions))
      .groupBy(detransTags.id, detransTags.name)
      .orderBy(sql`COALESCE(COUNT(DISTINCT CASE WHEN ${reasonField} = ${detransTags.id} AND ${userFilterCondition} THEN ${detransUsers.username} END), 0) DESC`);

    return NextResponse.json({ 
      data: detransitionReasons,
      total: detransitionReasons.length 
    });
  } catch (error) {
    console.error("Error fetching reasons:", error);
    return NextResponse.json(
      { error: "Failed to fetch reasons" },
      { status: 500 }
    );
  }
}
