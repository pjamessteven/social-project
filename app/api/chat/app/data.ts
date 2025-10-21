import { QdrantVectorStore } from "@llamaindex/qdrant";
import {
  SimpleDocumentStore,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";

// Module-level cache for indexes
let storiesIndexCache: VectorStoreIndex | null = null;
let commentsIndexCache: VectorStoreIndex | null = null;

export async function getStoriesIndex(params?: any, tags?: string[]) {
  console.log('[STORIES INDEX] Called with params:', params, 'tags:', tags);
  
  if (!storiesIndexCache) {
    console.log('[STORIES INDEX] Creating new stories index (first time)');
    
    const vectorStore = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "detrans_stories",
    });

    console.log('[STORIES INDEX] Vector store created successfully');
    storiesIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
    console.log('[STORIES INDEX] Index cached for future requests');
  } else {
    console.log('[STORIES INDEX] Using cached stories index');
  }

  return storiesIndexCache;
}

export async function getCommentsIndex(params?: any, tags?: string[]) {
  console.log('[COMMENTS INDEX] Called with params:', params, 'tags:', tags);
  
  if (!commentsIndexCache) {
    console.log('[COMMENTS INDEX] Creating new comments index (first time)');
    
    const vectorStore = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: "default",
    });

    console.log('[COMMENTS INDEX] Vector store created successfully');
    commentsIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
    console.log('[COMMENTS INDEX] Index cached for future requests');
  } else {
    console.log('[COMMENTS INDEX] Using cached comments index');
  }

  return commentsIndexCache;
}

