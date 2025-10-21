import { QdrantVectorStore } from "@llamaindex/qdrant";
import {
  SimpleDocumentStore,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";

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
  return results
    .map(result => {
      const firstPersonDensity = calculateFirstPersonDensity(result.content);
      const karmaScore = result.metadata?.score || 0;
      
      // Normalize karma score (assuming typical reddit scores range from -100 to 1000+)
      const normalizedKarma = Math.max(0, Math.min(1, (karmaScore + 100) / 1100));
      
      // Weighted scoring: cosine similarity (40%), first-person density (40%), karma (20%)
      const combinedScore = (result.score * 0.4) + (firstPersonDensity * 0.4) + (normalizedKarma * 0.2);
      
      return {
        ...result,
        score: combinedScore,
        firstPersonDensity,
        normalizedKarma
      };
    })
    .sort((a, b) => b.score - a.score);
}

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

export async function searchCombinedContent(query: string, params?: any, tags?: string[]): Promise<string> {
  // Get top-k stories (k=8)
  const storiesIndex = await getStoriesIndex(params, tags);
  const storiesQueryEngine = storiesIndex.asQueryEngine({ similarityTopK: 8 });
  const storiesResponse = await storiesQueryEngine.query({ query });
  
  // Get top-m comments (m=4)  
  const commentsIndex = await getCommentsIndex(params, tags);
  const commentsQueryEngine = commentsIndex.asQueryEngine({ similarityTopK: 4 });
  const commentsResponse = await commentsQueryEngine.query({ query });
  
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
  
  // Combine and re-rank
  const allResults = [...storyResults, ...commentResults];
  const reRankedResults = reRankResults(allResults);
  
  // Format the response
  const formattedResults = reRankedResults.slice(0, 10).map((result, index) => {
    const sourceLabel = result.source === 'stories' ? 'Personal Story' : 'Community Comment';
    return `[${index + 1}] ${sourceLabel} (Score: ${result.score.toFixed(3)}):\n${result.content}\n`;
  }).join('\n---\n\n');
  
  return `Found ${reRankedResults.length} relevant experiences, showing top 10 results:\n\n${formattedResults}`;
}

