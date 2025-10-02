import { QdrantClient } from "@qdrant/js-client-rest";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const topicId = parseInt(params.id);
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

    const client = new QdrantClient({ url: "http://localhost:6333" });

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Query Qdrant for nodes with matching topic_id

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

    const items = response.points.map((point) => {
      let text = "";
      
      // Extract text from _node_content JSON
      if (point.payload?._node_content) {
        try {
          const nodeContent = typeof point.payload._node_content === 'string' 
            ? JSON.parse(point.payload._node_content)
            : point.payload._node_content;
          text = nodeContent.text || "";
        } catch (error) {
          console.error("Error parsing _node_content:", error);
        }
      }

      return {
        id: point.id,
        text,
        topic_id: point.payload?.topic_id,
      };
    });

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
      { status: 500 },
    );
  }
}
