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
    
    try {
      const vectorStore = new QdrantVectorStore({
        url: process.env.QDRANT_URL || "http://localhost:6333",
        collectionName: "detrans_stories",
      });

      console.log('[STORIES INDEX] Vector store created successfully, building index...');
      storiesIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
      console.log('[STORIES INDEX] Index cached for future requests');
      
      // Test the index with a simple query
      try {
        const testQuery = await storiesIndexCache.asQueryEngine().query("test");
        console.log('[STORIES INDEX] Test query successful, response length:', testQuery.response?.length || 0);
      } catch (testError) {
        console.error('[STORIES INDEX] Test query failed:', testError);
      }
    } catch (error) {
      console.error('[STORIES INDEX] Failed to create index:', error);
      throw error;
    }
  } else {
    console.log('[STORIES INDEX] Using cached stories index');
  }

  return storiesIndexCache;
}

export async function getCommentsIndex(params?: any, tags?: string[]) {
  console.log('[COMMENTS INDEX] Called with params:', params, 'tags:', tags);
  
  if (!commentsIndexCache) {
    console.log('[COMMENTS INDEX] Creating new comments index (first time)');
    
    try {
      const vectorStore = new QdrantVectorStore({
        url: process.env.QDRANT_URL || "http://localhost:6333",
        collectionName: "default",
      });

      console.log('[COMMENTS INDEX] Vector store created successfully, building index...');
      commentsIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
      console.log('[COMMENTS INDEX] Index cached for future requests');
      
      // Test the index with a simple query
      try {
        const testQuery = await commentsIndexCache.asQueryEngine().query("test");
        console.log('[COMMENTS INDEX] Test query successful, response length:', testQuery.response?.length || 0);
      } catch (testError) {
        console.error('[COMMENTS INDEX] Test query failed:', testError);
      }
    } catch (error) {
      console.error('[COMMENTS INDEX] Failed to create index:', error);
      throw error;
    }
  } else {
    console.log('[COMMENTS INDEX] Using cached comments index');
  }

  return commentsIndexCache;
}

