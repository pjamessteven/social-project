import { requireAuth } from "@/app/lib/auth/middleware";
import { db } from "@/db";
import { studies, studyTagRelations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { QdrantVectorStore } from "@llamaindex/qdrant";

const STUDIES_COLLECTION = "detrans_studies";
const SUPPORTIVE_COLLECTION = "supportive_studies";

async function deleteStudyVectorsFromCollection(
  studyId: number,
  collectionName: string,
) {
  const vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName,
  });

  const client = vectorStore.client();

  // Find points with matching studyId
  const scrollResult = await client.scroll(collectionName, {
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
    await client.delete(collectionName, {
      points: pointIds,
    });
    console.log(
      `Deleted ${pointIds.length} vectors for study ${studyId} from ${collectionName}`,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });
    if (errorResponse) return errorResponse;

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
        // Delete from the primary collection
        await deleteStudyVectorsFromCollection(studyId, STUDIES_COLLECTION);
        // Also try the legacy supportive collection for backward compatibility
        await deleteStudyVectorsFromCollection(
          studyId,
          SUPPORTIVE_COLLECTION,
        );
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

    // Delete tag relations
    await db
      .delete(studyTagRelations)
      .where(eq(studyTagRelations.studyId, studyId));

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
