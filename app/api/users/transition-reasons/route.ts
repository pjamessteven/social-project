import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import postgres from "postgres";
import { detransUsers, detransTags } from "@/db/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    // Get all transition reason tags with user counts
    const transitionReasons = await db
      .select({
        id: detransTags.id,
        name: detransTags.name,
        userCount: sql<number>`COALESCE(COUNT(${detransUsers.username}), 0)`,
      })
      .from(detransTags)
      .leftJoin(detransUsers, eq(detransTags.id, detransUsers.transitionReasonId))
      .where(eq(detransTags.type, 'transition reason'))
      .groupBy(detransTags.id, detransTags.name)
      .orderBy(sql`COUNT(${detransUsers.username}) DESC`);

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
