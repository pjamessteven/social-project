/**
 * Study embeddings in the Qdrant `detrans_studies` collection: one point per
 * ~2,000-char chunk of the study text, each prefixed with a title/authors/year
 * header. Used by the approve route and scripts/embed-studies.ts.
 */
import { initSettings } from "@/app/api/chat/app/settings";
import { QdrantVectorStore } from "@llamaindex/qdrant";
import { Settings, TextNode, VectorStoreIndex } from "llamaindex";

export const STUDIES_COLLECTION = "detrans_studies";
const CHUNK_MAX_CHARS = 2000;

let searchClient: ReturnType<QdrantVectorStore["client"]> | null = null;

/**
 * Ids of the studies most relevant to `query`, best match first. The query is
 * embedded with the same model as the chunks and matched with Qdrant's
 * grouped search (one group per studyId), so a long paper with dozens of
 * chunks counts once and `limit` is a number of distinct studies. Callers
 * must have run initSettings() (the agent workflows do).
 */
export async function searchStudyIds(
  query: string,
  limit: number,
): Promise<number[]> {
  const vector = await Settings.embedModel.getQueryEmbedding({
    type: "text",
    text: query,
  });
  if (!vector) return [];
  searchClient ??= new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: STUDIES_COLLECTION,
  }).client();
  const { groups } = await searchClient.queryGroups(STUDIES_COLLECTION, {
    query: vector,
    group_by: "studyId",
    group_size: 1,
    limit,
    with_payload: false,
    with_vector: false,
  });
  return groups
    .map((g) => Number(g.id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

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

export async function deleteStudyVectors(
  studyId: number,
  collectionName: string,
) {
  initSettings();
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

export async function embedStudy(
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
