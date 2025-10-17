import { NextRequest, NextResponse } from "next/server";
import { sql, and, gte, lte, eq, isNotNull } from "drizzle-orm";
import { detransUsers, detransUserTags, detransTags } from "@/db/schema";
import { db } from "@/db";

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

    let result;

    if (tag) {
      // Query with tag filter
      result = await db
        .select({
          transitionAge: detransUsers.transitionAge,
          detransitionAge: detransUsers.detransitionAge,
          sex: detransUsers.sex,
          count: sql<number>`COUNT(*)`,
        })
        .from(detransUsers)
        .innerJoin(detransUserTags, eq(detransUsers.username, detransUserTags.username))
        .innerJoin(detransTags, eq(detransUserTags.tagId, detransTags.id))
        .where(and(...conditions, eq(detransTags.name, tag)))
        .groupBy(detransUsers.transitionAge, detransUsers.detransitionAge, detransUsers.sex)
        .orderBy(detransUsers.transitionAge, detransUsers.detransitionAge);
    } else {
      // Query without tag filter
      result = await db
        .select({
          transitionAge: detransUsers.transitionAge,
          detransitionAge: detransUsers.detransitionAge,
          sex: detransUsers.sex,
          count: sql<number>`COUNT(*)`,
        })
        .from(detransUsers)
        .where(and(...conditions))
        .groupBy(detransUsers.transitionAge, detransUsers.detransitionAge, detransUsers.sex)
        .orderBy(detransUsers.transitionAge, detransUsers.detransitionAge);
    }

    // Transform the data to include duration calculation
    const transformedData = result.map(row => ({
      transitionAge: row.transitionAge!,
      detransitionAge: row.detransitionAge!,
      duration: row.detransitionAge! - row.transitionAge!,
      sex: row.sex,
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
