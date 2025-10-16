import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq, and } from "drizzle-orm";
import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "@/db/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minAge = parseInt(searchParams.get("minAge") || "10");
    const maxAge = parseInt(searchParams.get("maxAge") || "50");
    const sex = searchParams.get("sex");

    // Build where conditions for tags
    const tagConditions = [eq(detransTags.type, 'transition reason')];
    
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

    // Get all transition reason tags with filtered user counts
    const transitionReasons = await db
      .select({
        id: detransTags.id,
        name: detransTags.name,
        userCount: sql<number>`COALESCE(COUNT(DISTINCT ${detransUserTags.username}), 0)`,
      })
      .from(detransTags)
      .leftJoin(detransUserTags, eq(detransTags.id, detransUserTags.tagId))
      .leftJoin(detransUsers, eq(detransUserTags.username, detransUsers.username))
      .where(and(
        ...tagConditions,
        ...(userConditions.length > 0 ? [and(...userConditions)] : [])
      ))
      .groupBy(detransTags.id, detransTags.name)
      .orderBy(sql`COUNT(DISTINCT ${detransUserTags.username}) DESC`);

    return NextResponse.json({ 
      data: transitionReasons,
      total: transitionReasons.length 
    });
  } catch (error) {
    console.error("Error fetching transition reasons:", error);
    return NextResponse.json(
      { error: "Failed to fetch transition reasons" },
      { status: 500 }
    );
  }
}
