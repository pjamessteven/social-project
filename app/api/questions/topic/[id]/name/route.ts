import { QdrantClient } from "@qdrant/js-client-rest";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const topicId = parseInt(id);
    if (isNaN(topicId)) {
      return NextResponse.json({ error: "Invalid topic ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
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

    const client = new QdrantClient({
      url: "http://localhost:6333",
      checkCompatibility: false,
      timeout: 10000, // 10 second timeout
    });

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    console.log(`Querying topic_id: ${topicId}, offset: ${offset}`);

    // Query Qdrant for nodes with matching topic_id
    const response = await client.scroll("default_topics", {
      filter: {
        must: [
          {
            key: "topic_id",
            match: {
              value: topicId,
            },
          },
        ],
      },
      limit: 1,
      offset: offset,
      with_payload: true,
      with_vector: false,
    });

    console.log(
      `Found ${response.points.length} points for topic_id: ${topicId}`,
    );

    // Get total count for pagination info
    const countResponse = await client.count("default_topics", {
      filter: {
        must: [
          {
            key: "topic_id",
            match: {
              value: topicId,
            },
          },
        ],
      },
    });

    console.log(`Total count for topic_id ${topicId}: ${countResponse.count}`);

    const total = countResponse.count;
    const totalPages = Math.ceil(total / limit);

    const point = response.points[0];
    if (point && point.payload) {
      return NextResponse.json({
        topic_id: point.payload.topic_id,
        name: point.payload.title,
        label: point.payload.label,
        keywords: point.payload.keywords,
        keyword_name: point.payload.keyword_name,
        questionCount: point.payload.question_count,
        isSynthetic: point.payload.is_synthetic,
      });
    }

    return NextResponse.json(
      { error: `Topic with ID ${topicId} not found` },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error fetching questions by topic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
