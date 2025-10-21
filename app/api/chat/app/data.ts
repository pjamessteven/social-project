import { QdrantVectorStore } from "@llamaindex/qdrant";
import {
  SimpleDocumentStore,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";

export async function getStoriesIndex(params?: any, tags?: string[]) {
  const vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "detrans_stories",
  });

  // Add tag filtering if tags are provided
  if (tags && tags.length > 0) {
    const filter = {
      should: tags.map(tag => ({
        key: "tags",
        match: {
          value: tag
        }
      }))
    };
    
    // Apply filter to vector store
    vectorStore.clientConfig = {
      ...vectorStore.clientConfig,
      filter
    };
  }

  return await VectorStoreIndex.fromVectorStore(vectorStore);
}

export async function getCommentsIndex(params?: any, tags?: string[]) {
  const vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "default",
  });

  // Add tag filtering if tags are provided  
  if (tags && tags.length > 0) {
    const filter = {
      should: tags.map(tag => ({
        key: "tags",
        match: {
          value: tag
        }
      }))
    };
    
    // Apply filter to vector store
    vectorStore.clientConfig = {
      ...vectorStore.clientConfig,
      filter
    };
  }

  return await VectorStoreIndex.fromVectorStore(vectorStore);
}

