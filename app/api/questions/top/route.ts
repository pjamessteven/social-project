import { connectRedis } from "@/app/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "detrans";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

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

    const redis = await connectRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis connection failed" },
        { status: 500 },
      );
    }

    const key = `${mode}:page_views`;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count
    const total = await redis.zCard(key);

    // Get paginated results with scores (highest score first)
    // ZREVRANGE returns in descending order by score
    const results = await redis.zRevRangeWithScores(
      key,
      offset,
      offset + limit - 1,
    );

    // Format the response
    const items = [];
    if (Array.isArray(results) && results.length > 0) {
      for (let i = 0; i < results.length; i += 2) {
        items.push({
          page: results[i] as string,
          score: results[i + 1] as number,
        });
      }
    }

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
