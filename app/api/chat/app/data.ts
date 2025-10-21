import { QdrantVectorStore } from "@llamaindex/qdrant";
import {
  SimpleDocumentStore,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";

// Module-level cache for indexes
let storiesIndexCache: VectorStoreIndex | null = null;
let commentsIndexCache: VectorStoreIndex | null = null;

interface SearchResult {
  content: string;
  score: number;
  source: 'stories' | 'comments';
  metadata?: any;
}

function calculateFirstPersonDensity(text: string): number {
  const firstPersonVerbs = [
    'i am', 'i was', 'i have', 'i had', 'i do', 'i did', 'i will', 'i would',
    'i can', 'i could', 'i should', 'i feel', 'i felt', 'i think', 'i thought',
    'i know', 'i knew', 'i see', 'i saw', 'i want', 'i wanted', 'i need', 'i needed',
    'i like', 'i liked', 'i love', 'i loved', 'i hate', 'i hated', 'i went', 'i go',
    'i came', 'i come', 'i started', 'i start', 'i stopped', 'i stop', 'i tried', 'i try',
    'i decided', 'i decide', 'i realized', 'i realize', 'i understand', 'i understood',
    'i believe', 'i believed', 'i remember', 'i remembered', 'i forgot', 'i forget'
  ];
  
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const totalWords = words.length;
  
  if (totalWords === 0) return 0;
  
  let firstPersonCount = 0;
  for (const verb of firstPersonVerbs) {
    const matches = lowerText.match(new RegExp(`\\b${verb}\\b`, 'g'));
    if (matches) {
      firstPersonCount += matches.length;
    }
  }
  
  return firstPersonCount / totalWords;
}

function reRankResults(results: SearchResult[]): SearchResult[] {
  console.log('[RE-RANK] Starting re-ranking of', results.length, 'results');
  
  const reRanked = results
    .map((result, index) => {
      const firstPersonDensity = calculateFirstPersonDensity(result.content);
      const karmaScore = result.metadata?.score || 0;
      
      // Normalize karma score (assuming typical reddit scores range from -100 to 1000+)
      const normalizedKarma = Math.max(0, Math.min(1, (karmaScore + 100) / 1100));
      
      // Weighted scoring: cosine similarity (40%), first-person density (40%), karma (20%)
      const combinedScore = (result.score * 0.4) + (firstPersonDensity * 0.4) + (normalizedKarma * 0.2);
      
      console.log(`[RE-RANK] Result ${index + 1}:`, {
        originalScore: result.score.toFixed(3),
        firstPersonDensity: firstPersonDensity.toFixed(3),
        karmaScore,
        normalizedKarma: normalizedKarma.toFixed(3),
        combinedScore: combinedScore.toFixed(3),
        source: result.source
      });
      
      return {
        ...result,
        score: combinedScore,
        firstPersonDensity,
        normalizedKarma
      };
    })
    .sort((a, b) => b.score - a.score);
    
  console.log('[RE-RANK] Re-ranking complete, new order:', reRanked.map((r, i) => `${i + 1}. ${r.source} (${r.score.toFixed(3)})`));
  
  return reRanked;
}

export async function getStoriesIndex(params?: any, tags?: string[]) {
  if (!storiesIndexCache) {
    console.log('[STORIES INDEX] Creating new stories index (first time) with tags:', tags);
    
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
  if (!commentsIndexCache) {
    console.log('[COMMENTS INDEX] Creating new comments index (first time) with tags:', tags);
    
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

export async function searchCombinedContent(query: string, params?: any, tags?: string[]): Promise<string> {
  console.log('[SEARCH COMBINED] Starting combined search');
  console.log('[SEARCH COMBINED] Query:', query);
  console.log('[SEARCH COMBINED] Tags filter:', tags);
  console.log('[SEARCH COMBINED] Params:', params);
  
  // Create filter for tags if provided
  let filter = undefined;
  if (tags && tags.length > 0) {
    filter = {
      should: tags.map(tag => ({
        key: "tags",
        match: {
          value: tag
        }
      }))
    };
    console.log('[SEARCH COMBINED] Using filter:', JSON.stringify(filter, null, 2));
  } else {
    console.log('[SEARCH COMBINED] No tags provided, searching all content');
  }
  
  // Create both indexes in parallel for better performance
  console.log('[SEARCH COMBINED] Creating indexes in parallel...');
  const [storiesIndex, commentsIndex] = await Promise.all([
    getStoriesIndex(params),
    getCommentsIndex(params)
  ]);
  console.log('[SEARCH COMBINED] Both indexes created successfully');
  
  // Create query engines
  const storiesQueryEngine = storiesIndex.asQueryEngine({ 
    similarityTopK: 8,
    ...(filter && { filter })
  });
  const commentsQueryEngine = commentsIndex.asQueryEngine({ 
    similarityTopK: 4,
    ...(filter && { filter })
  });
  
  // Execute queries in parallel
  console.log('[SEARCH COMBINED] Executing queries in parallel...');
  const [storiesResponse, commentsResponse] = await Promise.all([
    storiesQueryEngine.query({ query }),
    commentsQueryEngine.query({ query })
  ]);
  console.log('[SEARCH COMBINED] Stories response nodes count:', storiesResponse.sourceNodes?.length || 0);
  console.log('[SEARCH COMBINED] Comments response nodes count:', commentsResponse.sourceNodes?.length || 0);
  
  // Extract results with metadata
  const storyResults: SearchResult[] = storiesResponse.sourceNodes?.map(node => ({
    content: node.node.text,
    score: node.score || 0,
    source: 'stories' as const,
    metadata: node.node.metadata
  })) || [];
  
  const commentResults: SearchResult[] = commentsResponse.sourceNodes?.map(node => ({
    content: node.node.text,
    score: node.score || 0,
    source: 'comments' as const,
    metadata: node.node.metadata
  })) || [];
  
  console.log('[SEARCH COMBINED] Story results count:', storyResults.length);
  console.log('[SEARCH COMBINED] Comment results count:', commentResults.length);
  console.log('[SEARCH COMBINED] Story scores:', storyResults.map(r => r.score.toFixed(3)));
  console.log('[SEARCH COMBINED] Comment scores:', commentResults.map(r => r.score.toFixed(3)));
  
  // Combine and re-rank
  const allResults = [...storyResults, ...commentResults];
  console.log('[SEARCH COMBINED] Total results before re-ranking:', allResults.length);
  
  const reRankedResults = reRankResults(allResults);
  console.log('[SEARCH COMBINED] Results after re-ranking:', reRankedResults.length);
  console.log('[SEARCH COMBINED] Top 5 re-ranked scores:', reRankedResults.slice(0, 5).map(r => ({
    score: r.score.toFixed(3),
    source: r.source,
    firstPersonDensity: r.firstPersonDensity?.toFixed(3),
    normalizedKarma: r.normalizedKarma?.toFixed(3)
  })));
  
  // Format the response
  const formattedResults = reRankedResults.slice(0, 10).map((result, index) => {
    const sourceLabel = result.source === 'stories' ? 'Personal Story' : 'Community Comment';
    return `[${index + 1}] ${sourceLabel} (Score: ${result.score.toFixed(3)}):\n${result.content}\n`;
  }).join('\n---\n\n');
  
  const finalResponse = `Found ${reRankedResults.length} relevant experiences, showing top 10 results:\n\n${formattedResults}`;
  console.log('[SEARCH COMBINED] Final response length:', finalResponse.length);
  
  return finalResponse;
}

