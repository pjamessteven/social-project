import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { detransTags, detransUserTags } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const tagsWithCounts = await db
      .select({
        id: detransTags.id,
        name: detransTags.name,
        nameTranslation: detransTags.nameTranslation,
        userCount: sql<number>`COALESCE(COUNT(${detransUserTags.username}), 0)`,
      })
      .from(detransTags)
      .leftJoin(detransUserTags, sql`${detransTags.id} = ${detransUserTags.tagId}`)
      .groupBy(detransTags.id, detransTags.name, detransTags.nameTranslation)
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
