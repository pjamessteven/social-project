import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransTags, detransUserTags } from "../../../db/schema";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const tagsWithCounts = await db
      .select({
        id: detransTags.id,
        name: detransTags.name,
        userCount: sql<number>`COALESCE(COUNT(${detransUserTags.username}), 0)`,
      })
      .from(detransTags)
      .leftJoin(detransUserTags, sql`${detransTags.id} = ${detransUserTags.tagId}`)
      .groupBy(detransTags.id, detransTags.name)
      .orderBy(sql`COALESCE(COUNT(${detransUserTags.username}), 0) DESC`);

    const tagsWithParsedCounts = tagsWithCounts.map(tag => ({
      ...tag,
      userCount: Number(tag.userCount)
    }));

    return NextResponse.json({ tags: tagsWithParsedCounts });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
