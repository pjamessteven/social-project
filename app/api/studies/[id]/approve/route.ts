import { isAdmin } from "@/app/lib/auth/auth";
import { extractPdfText } from "@/app/lib/pdf";
import { db } from "@/db";
import { studies, studyTags, studyTagRelations } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { QdrantVectorStore } from "@llamaindex/qdrant";
import { TextNode, VectorStoreIndex } from "llamaindex";
import { initSettings } from "@/app/api/chat/app/settings";

const STUDIES_COLLECTION = "detrans_studies";
const CHUNK_MAX_CHARS = 2000;

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed.length <= CHUNK_MAX_CHARS) {
      chunks.push(trimmed);
      continue;
    }

    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > CHUNK_MAX_CHARS) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks;
}

async function deleteStudyVectors(studyId: number, collectionName: string) {
  const vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName,
  });

  const client = vectorStore.client();

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
      `Deleted ${pointIds.length} old vectors for study ${studyId} from ${collectionName}`,
    );
  }
}

async function embedStudy(
  studyId: number,
  fullText: string,
  title: string,
  authors: string,
  year: number | null,
  url: string,
  abstract: string,
  conclusion: string,
  keyPoints: string[],
  collectionName: string,
) {
  const chunks = chunkText(fullText);

  if (chunks.length === 0) {
    throw new Error("Could not chunk full text");
  }

  const header = `Title: ${title || "Unknown"}
Authors: ${authors || "Unknown"}
Year: ${year || "Unknown"}

`;

  const nodes: TextNode[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkTextContent = header + chunks[i];

    const node = new TextNode({
      text: chunkTextContent,
      metadata: {
        studyId: studyId,
        title: title || "",
        authors: authors || "",
        year: year || 0,
        url: url || "",
        abstract: abstract || "",
        conclusion: conclusion || "",
        keyPoints: JSON.stringify(keyPoints),
        type: "study",
      },
    });

    nodes.push(node);
  }

  initSettings();

  const vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName,
  });

  const index = await VectorStoreIndex.fromVectorStore(vectorStore);
  await index.insertNodes(nodes);

  return chunks.length;
}

async function upsertTags(studyId: number, tagNames: string[]) {
  // Delete existing relations
  await db
    .delete(studyTagRelations)
    .where(eq(studyTagRelations.studyId, studyId));

  if (tagNames.length === 0) return;

  // Upsert tags into study_tags table
  for (const name of tagNames) {
    await db
      .insert(studyTags)
      .values({ name })
      .onConflictDoNothing({ target: studyTags.name });
  }

  // Get tag IDs
  const tagRecords = await db
    .select()
    .from(studyTags)
    .where(inArray(studyTags.name, tagNames));

  // Create relations
  if (tagRecords.length > 0) {
    await db.insert(studyTagRelations).values(
      tagRecords.map((tag) => ({
        studyId,
        tagId: tag.id,
      })),
    );
  }
}

export async function POST(
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

    const existingStudy = await db
      .select()
      .from(studies)
      .where(eq(studies.id, studyId))
      .limit(1);

    if (!existingStudy[0]) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const study = existingStudy[0];

    // Parse multipart form data
    const formData = await request.formData();

    const pdfFile = formData.get("pdf") as File | null;
    let fullText = (formData.get("fullText") as string) || "";

    // If PDF uploaded, extract text from it
    if (pdfFile && pdfFile.size > 0) {
      try {
        const extractedText = await extractPdfText(pdfFile);
        if (extractedText.trim()) {
          fullText = fullText.trim() || extractedText;
        }
      } catch (pdfError) {
        console.error("Failed to parse PDF:", pdfError);
        return NextResponse.json(
          { error: "Failed to parse PDF. Please paste the text manually." },
          { status: 400 },
        );
      }
    }

    const abstract = (formData.get("abstract") as string) || "";
    const conclusion = (formData.get("conclusion") as string) || "";
    const summary = (formData.get("summary") as string) || "";
    const keyPointsRaw = (formData.get("keyPoints") as string) || "";
    const title = (formData.get("title") as string) || study.title || "";
    const authors = (formData.get("authors") as string) || study.authors || "";
    const yearStr = (formData.get("year") as string) || "";
    const journal = (formData.get("journal") as string) || study.journal || "";
    const headline =
      (formData.get("headline") as string) || study.headline || "";
    const description =
      (formData.get("description") as string) || study.description || "";
    const tagsRaw = (formData.get("tags") as string) || "";
    const limitationsRaw =
      (formData.get("limitations") as string) || "";
    const limitations = limitationsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const regenerateEmbedding = formData.get("regenerateEmbedding") === "on";

    const keyPoints = keyPointsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const year = yearStr ? parseInt(yearStr, 10) : study.year;

    // Validate required fields
    if (
      !fullText ||
      !abstract ||
      !conclusion ||
      !summary ||
      keyPoints.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: fullText, abstract, conclusion, summary, keyPoints",
        },
        { status: 400 },
      );
    }

    // Delete old vectors if regenerating
    if (study.approved && regenerateEmbedding) {
      try {
        await deleteStudyVectors(studyId, STUDIES_COLLECTION);
      } catch (deleteError) {
        console.error(
          `Failed to delete old vectors for study ${studyId}:`,
          deleteError,
        );
        return NextResponse.json(
          { error: "Failed to clean up old embeddings" },
          { status: 500 },
        );
      }
    }

    // Update study in DB
    const updatedStudy = await db
      .update(studies)
      .set({
        approved: true,
        fullText,
        abstract,
        conclusion,
        summary,
        keyPoints,
        title: title || study.title,
        authors: authors || study.authors,
        year: year || study.year,
        journal: journal || study.journal,
        headline: headline || study.headline,
        description: description || study.description,
        limitations: limitations.length > 0 ? limitations : null,
        updatedAt: new Date(),
      })
      .where(eq(studies.id, studyId))
      .returning();

    // Upsert normalized tags
    await upsertTags(studyId, tags);

    // Only regenerate embeddings for new approvals or when explicitly requested
    const shouldEmbed = !study.approved || regenerateEmbedding;
    let chunksCreated = 0;

    if (shouldEmbed) {
      try {
        chunksCreated = await embedStudy(
          studyId,
          fullText,
          title || study.title || "",
          authors || study.authors || "",
          year || study.year || null,
          study.url || "",
          abstract,
          conclusion,
          keyPoints,
          STUDIES_COLLECTION,
        );
        console.log(
          `Approved study ${studyId}: created ${chunksCreated} chunks in ${STUDIES_COLLECTION}`,
        );
      } catch (embedError) {
        console.error("Failed to embed study:", embedError);
        return NextResponse.json(
          { error: "Failed to create embeddings" },
          { status: 500 },
        );
      }
    } else {
      console.log(`Edited study ${studyId}: skipped embedding regeneration`);
    }

    return NextResponse.json({
      success: true,
      study: updatedStudy[0],
      chunksCreated,
      regenerated: shouldEmbed,
    });
  } catch (error) {
    console.error("Error approving study:", error);
    return NextResponse.json(
      { error: "Failed to approve study" },
      { status: 500 },
    );
  }
}
