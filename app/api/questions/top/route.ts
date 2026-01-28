import { db, detransQuestions } from "@/db";
import { desc, like } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "detrans";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const query = searchParams.get("q");

    // Validate parameters
    if (page < 1) {
      return NextResponse.json({ error: "Page must be >= 1" }, { status: 400 });
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 },
      );
    }

    // Select the appropriate table based on mode
    const questionsTable = detransQuestions;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build queries with conditional where clause
    const whereCondition =
      query && query.trim()
        ? like(questionsTable.name, `%${query.trim()}%`)
        : undefined;

    // Get total count
    const totalResult = whereCondition
      ? await db
          .select({ count: questionsTable.name })
          .from(questionsTable)
          .where(whereCondition)
      : await db.select({ count: questionsTable.name }).from(questionsTable);

    const total = totalResult.length;

    // Get paginated results ordered by views count (highest first)
    const results = whereCondition
      ? await db
          .select({
            name: questionsTable.name,
            viewsCount: questionsTable.viewsCount,
            mostRecentlyAsked: questionsTable.mostRecentlyAsked,
          })
          .from(questionsTable)
          .where(whereCondition)
          .orderBy(desc(questionsTable.viewsCount))
          .limit(limit)
          .offset(offset)
      : await db
          .select({
            name: questionsTable.name,
            viewsCount: questionsTable.viewsCount,
            mostRecentlyAsked: questionsTable.mostRecentlyAsked,
          })
          .from(questionsTable)
          .orderBy(desc(questionsTable.viewsCount))
          .limit(limit)
          .offset(offset);

    // Format the response
    const items = results.map((result) => ({
      page: result.name,
      score: result.viewsCount,
      mostRecentlyAsked: result.mostRecentlyAsked,
    }));

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (error) {
    console.error("Error fetching top pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
