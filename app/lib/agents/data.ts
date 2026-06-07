import { QdrantVectorStore } from "@llamaindex/qdrant";
import { VectorStoreIndex } from "llamaindex";

let commentsIndexCache: VectorStoreIndex | null = null;
let transCommentsIndexCache: VectorStoreIndex | null = null;
let storiesIndexCache: VectorStoreIndex | null = null;
let videosIndexCache: VectorStoreIndex | null = null;
let studiesIndexCache: VectorStoreIndex | null = null;

export async function getCommentsIndex(
  params?: any,
  locale?: string,
  tags?: string[],
) {
  if (!commentsIndexCache) {
    const vectorStore = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "default",
    });
    commentsIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
  }
  return commentsIndexCache;
}

export async function getTransCommentsIndex(
  params?: any,
  locale?: string,
  tags?: string[],
) {
  if (!transCommentsIndexCache) {
    const vectorStore = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "trans",
    });
    transCommentsIndexCache =
      await VectorStoreIndex.fromVectorStore(vectorStore);
  }
  return transCommentsIndexCache;
}

export async function getStoriesIndex(
  params?: any,
  locale?: string,
  tags?: string[],
) {
  if (!storiesIndexCache) {
    const vectorStore = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "detrans_stories",
    });
    storiesIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
  }
  return storiesIndexCache;
}

export async function getVideosIndex(
  params?: any,
  locale?: string,
  tags?: string[],
) {
  if (!videosIndexCache) {
    const vectorStore = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "detrans_video_transcripts",
    });
    videosIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
  }
  return videosIndexCache;
}

export async function getStudiesIndex(
  params?: any,
  locale?: string,
  tags?: string[],
) {
  if (!studiesIndexCache) {
    const vectorStore = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "detrans_studies",
    });
    studiesIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
  }
  return studiesIndexCache;
}
