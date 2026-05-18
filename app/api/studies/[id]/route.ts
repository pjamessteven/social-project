import { isAdmin } from "@/app/lib/auth/auth";
import { db } from "@/db";
import { studies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { QdrantVectorStore } from "@llamaindex/qdrant";

const COLLECTION_NAME = "detrans_studies";

async function deleteStudyVectors(studyId: number) {
  const vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: COLLECTION_NAME,
  });

  const client = vectorStore.client();

  // Find points with matching studyId
  const scrollResult = await client.scroll(COLLECTION_NAME, {
    filter: {
      must: [
        {
          key: "studyId",
          match: { value: studyId },
        },
      ],
    },
    limit: 1000,
    with_payload: false,
    with_vector: false,
  });

  const pointIds = scrollResult.points.map((p) => p.id);

  if (pointIds.length > 0) {
    await client.delete(COLLECTION_NAME, {
      points: pointIds,
    });
    console.log(
      `Deleted ${pointIds.length} vectors for study ${studyId}`,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const studyId = parseInt(id, 10);
    if (isNaN(studyId)) {
      return NextResponse.json({ error: "Invalid study ID" }, { status: 400 });
    }

    // Get existing study
    const existingStudy = await db
      .select()
      .from(studies)
      .where(eq(studies.id, studyId))
      .limit(1);

    if (!existingStudy[0]) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const study = existingStudy[0];

    // Delete Qdrant vectors first
    if (study.approved) {
      try {
        await deleteStudyVectors(studyId);
      } catch (qdrantError) {
        console.error(
          `Failed to delete Qdrant vectors for study ${studyId}:`,
          qdrantError,
        );
        return NextResponse.json(
          { error: "Failed to remove embeddings" },
          { status: 500 },
        );
      }
    }

    // Delete study from DB
    await db.delete(studies).where(eq(studies.id, studyId));

    return NextResponse.json({
      success: true,
      message: `Study ${studyId} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting study:", error);
    return NextResponse.json(
      { error: "Failed to delete study" },
      { status: 500 },
    );
  }
}
