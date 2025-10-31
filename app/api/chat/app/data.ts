import { QdrantVectorStore } from "@llamaindex/qdrant";
import {
  VectorStoreIndex,
} from "llamaindex";

// Module-level cache for indexes
let storiesIndexCache: VectorStoreIndex | null = null;
let commentsIndexCache: VectorStoreIndex | null = null;
let videosIndexCache: VectorStoreIndex | null = null;

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
      console.log('[STORIES INDEX] Qdrant URL:', process.env.QDRANT_URL || "http://localhost:6333");
      console.log('[STORIES INDEX] Collection name: detrans_stories');
      
      storiesIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
      console.log('[STORIES INDEX] Index created:', !!storiesIndexCache);
      console.log('[STORIES INDEX] Index cached for future requests');
      
      // Test the index with a simple query
      try {
        const queryEngine = storiesIndexCache.asQueryEngine();
        if (queryEngine) {
       //   const testQuery = await queryEngine.query("test");
        //  console.log('[STORIES INDEX] Test query successful, response length:', testQuery.response?.length || 0);
        } else {
          console.warn('[STORIES INDEX] Query engine is undefined, index may be empty');
        }
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
      console.log('[COMMENTS INDEX] Qdrant URL:', process.env.QDRANT_URL || "http://localhost:6333");
      console.log('[COMMENTS INDEX] Collection name: default');
      
      commentsIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
      console.log('[COMMENTS INDEX] Index created:', !!commentsIndexCache);
      console.log('[COMMENTS INDEX] Index cached for future requests');
      
      // Test the index with a simple query
      try {
        const queryEngine = commentsIndexCache.asQueryEngine();
        if (queryEngine) {
          //const testQuery = await queryEngine.query("test");
         // console.log('[COMMENTS INDEX] Test query successful, response length:', testQuery.response?.length || 0);
        } else {
          console.warn('[COMMENTS INDEX] Query engine is undefined, index may be empty');
        }
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


export async function getVideosIndex(params?: any, tags?: string[]) {
  console.log('[VIDEOS INDEX] Called with params:', params, 'tags:', tags);
  
  if (!videosIndexCache) {
    console.log('[VIDEOS INDEX] Creating new comments index (first time)');
    
    try {
      const vectorStore = new QdrantVectorStore({
        url: process.env.QDRANT_URL || "http://localhost:6333",
        collectionName: "detrans_video_transcripts",
      });

      console.log('[VIDEOS INDEX] Vector store created successfully, building index...');
      console.log('[VIDEOS INDEX] Qdrant URL:', process.env.QDRANT_URL || "http://localhost:6333");
      console.log('[VIDEOS INDEX] Collection name: detrans_video_transcripts');
      
      videosIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
      console.log('[VIDEOS INDEX] Index created:', !!commentsIndexCache);
      console.log('[VIDEOS INDEX] Index cached for future requests');
      
      // Test the index with a simple query
      try {
        const queryEngine = videosIndexCache.asQueryEngine();
        if (queryEngine) {
          //const testQuery = await queryEngine.query("test");
         // console.log('[COMMENTS INDEX] Test query successful, response length:', testQuery.response?.length || 0);
        } else {
          console.warn('[VIDEOS INDEX] Query engine is undefined, index may be empty');
        }
      } catch (testError) {
        console.error('[VIDEOS INDEX] Test query failed:', testError);
      }
    } catch (error) {
      console.error('[VIDEOS INDEX] Failed to create index:', error);
      throw error;
    }
  } else {
    console.log('[VIDEOS INDEX] Using cached comments index');
  }

  return videosIndexCache;
}

