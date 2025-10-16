import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detransUsers, detransUserTags } from "@/lib/db/schema";
import { sql, and, gte, lte, eq, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minAge = parseInt(searchParams.get("minAge") || "10");
    const maxAge = parseInt(searchParams.get("maxAge") || "50");
    const sex = searchParams.get("sex");
    const tag = searchParams.get("tag");

    // Build where conditions for filtering
    const conditions = [];
    
    // Filter by sex if provided
    if (sex) {
      conditions.push(eq(detransUsers.sex, sex));
    }

    // Age filters for both transition and detransition ages
    conditions.push(
      gte(detransUsers.transitionAge, minAge),
      lte(detransUsers.transitionAge, maxAge),
      gte(detransUsers.detransitionAge, minAge),
      lte(detransUsers.detransitionAge, maxAge),
      isNotNull(detransUsers.transitionAge),
      isNotNull(detransUsers.detransitionAge)
    );

    let query = db
      .select({
        transitionAge: detransUsers.transitionAge,
        detransitionAge: detransUsers.detransitionAge,
        count: sql<number>`COUNT(*)`,
      })
      .from(detransUsers);

    // Join with tags if tag filter is provided
    if (tag) {
      query = query
        .innerJoin(detransUserTags, eq(detransUsers.username, detransUserTags.username))
        .innerJoin(
          sql`(SELECT id FROM detrans_tags WHERE name = ${tag})`,
          sql`detrans_user_tags.tag_id = detrans_tags.id`
        );
    }

    const result = await query
      .where(and(...conditions))
      .groupBy(detransUsers.transitionAge, detransUsers.detransitionAge)
      .orderBy(detransUsers.transitionAge, detransUsers.detransitionAge);

    // Transform the data to include duration calculation
    const transformedData = result.map(row => ({
      transitionAge: row.transitionAge!,
      detransitionAge: row.detransitionAge!,
      duration: row.detransitionAge! - row.transitionAge!,
      count: row.count,
    }));

    return NextResponse.json({
      data: transformedData,
      total: transformedData.length,
    });
  } catch (error) {
    console.error("Error fetching transition duration data:", error);
    return NextResponse.json(
      { error: "Failed to fetch transition duration data" },
      { status: 500 }
    );
  }
}
