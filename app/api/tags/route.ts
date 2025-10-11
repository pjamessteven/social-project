import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tags, userTags } from "../../../db/schema";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const tagsWithCounts = await db
      .select({
        id: tags.id,
        name: tags.name,
        userCount: sql<number>`COALESCE(COUNT(${userTags.username}), 0)`,
      })
      .from(tags)
      .leftJoin(userTags, sql`${tags.id} = ${userTags.tagId}`)
      .groupBy(tags.id, tags.name)
      .orderBy(sql`COALESCE(COUNT(${userTags.username}), 0) DESC`);

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
