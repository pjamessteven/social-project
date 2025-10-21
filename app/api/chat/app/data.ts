import { QdrantVectorStore } from "@llamaindex/qdrant";
import {
  SimpleDocumentStore,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";

export async function getStoriesIndex(params?: any) {
  const vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "detrans_stories",
  });

  return await VectorStoreIndex.fromVectorStore(vectorStore);
}
export async function getCommentsIndex(params?: any) {
  const vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "default",
  });

  return await VectorStoreIndex.fromVectorStore(vectorStore);
}

