import { NextRequest, NextResponse } from "next/server";
import { QdrantVectorStore } from "llamaindex";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topicId = parseInt(params.id);
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: "Invalid topic ID" },
        { status: 400 }
      );
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
        { status: 400 }
      );
    }

    const vectorStore = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "default_questions",
    });

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Query Qdrant for nodes with matching topic_id
    const client = vectorStore.client;
    const response = await client.scroll("default_questions", {
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
      limit: limit,
      offset: offset,
      with_payload: true,
      with_vector: false,
    });

    // Get total count for pagination info
    const countResponse = await client.count("default_questions", {
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

    const total = countResponse.count;
    const totalPages = Math.ceil(total / limit);

    const items = response.points.map((point) => ({
      id: point.id,
      question: point.payload?.question || "",
      topic_id: point.payload?.topic_id,
      ...point.payload,
    }));

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching questions by topic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
