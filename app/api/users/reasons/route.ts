import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq, and } from "drizzle-orm";
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
