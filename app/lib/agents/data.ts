import { QdrantVectorStore } from "@llamaindex/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import { VectorStoreIndex } from "llamaindex";

let commentsIndexCache: VectorStoreIndex | null = null;
let transCommentsIndexCache: VectorStoreIndex | null = null;
let storiesIndexCache: VectorStoreIndex | null = null;
let videosIndexCache: VectorStoreIndex | null = null;
let studiesIndexCache: VectorStoreIndex | null = null;

const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";

// Shared Qdrant client for direct queries (bypasses LlamaIndex for named vectors)
let qdrantClientCache: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!qdrantClientCache) {
    qdrantClientCache = new QdrantClient({
      url: qdrantUrl,
      checkCompatibility: false,
      timeout: 30000,
    });
  }
  return qdrantClientCache;
}

// ── Multi-vector comment search ─────────────────────────────────────────────
const DEFAULT_V2_COLLECTION = "default_v2";

interface QueryCommentsV2Options {
  queryEmbedding: number[];
  topK?: number;
  keyword?: string; // filter on excerptKeywords payload field
}

const QUESTIONS_WEIGHT = 0.55;
const SUMMARY_WEIGHT = 0.45;
const UPVOTE_WEIGHT = 0.3;
const UPVOTE_REFERENCE = Math.log10(1 + 1000); // ~3.0, reasonable Reddit ceiling

/**
 * Search default_v2 using 2 named vectors (questions, summary), fuse scores
 * by weighted average across vectors, re-rank with upvote adjustment, and
 * return top `topK` results in LlamaIndex NodeWithScore JSON format.
 *
 * When `keywords` is provided, Qdrant filters results to only comments whose
 * `excerptKeywords` payload contains ALL specified keywords (AND logic,
 * substring match).
 */
export async function queryCommentsV2({
  queryEmbedding,
  topK = 20,
  keyword,
}: QueryCommentsV2Options): Promise<string> {
  const client = getQdrantClient();
  const searchLimit = topK * 3;

  // Build Qdrant filter for keyword substring matching
  const filter = keyword
    ? { must: [{ key: "excerptKeywords", match: { text: keyword } }] }
    : undefined;

  // Search both named vectors in parallel
  const [questionsResults, summaryResults] = await Promise.all([
    client.query(DEFAULT_V2_COLLECTION, {
      query: queryEmbedding,
      using: "questions",
      limit: searchLimit,
      with_payload: true,
      with_vector: false,
      ...(filter && { filter }),
    }),
    client.query(DEFAULT_V2_COLLECTION, {
      query: queryEmbedding,
      using: "summary",
      limit: searchLimit,
      with_payload: true,
      with_vector: false,
      ...(filter && { filter }),
    }),
  ]);

  // Build per-comment score map: track score from each vector
  const commentScores = new Map<
    string,
    {
      questionsScore: number | null;
      summaryScore: number | null;
      payload: Record<string, unknown>;
    }
  >();

  for (const pt of questionsResults.points) {
    const payload = pt.payload as Record<string, unknown>;
    const commentId = payload.id as string;
    if (!commentId) continue;
    const existing = commentScores.get(commentId);
    if (existing) {
      existing.questionsScore = pt.score;
    } else {
      commentScores.set(commentId, {
        questionsScore: pt.score,
        summaryScore: null,
        payload,
      });
    }
  }

  for (const pt of summaryResults.points) {
    const payload = pt.payload as Record<string, unknown>;
    const commentId = payload.id as string;
    if (!commentId) continue;
    const existing = commentScores.get(commentId);
    if (existing) {
      existing.summaryScore = pt.score;
    } else {
      commentScores.set(commentId, {
        questionsScore: null,
        summaryScore: pt.score,
        payload,
      });
    }
  }

  // Score fusion + upvote re-ranking
  const ranked = Array.from(commentScores.values())
    .map((item) => {
      // Fused semantic score: weighted average across vectors that returned this comment
      let semanticScore: number;
      if (item.questionsScore !== null && item.summaryScore !== null) {
        semanticScore =
          item.questionsScore * QUESTIONS_WEIGHT +
          item.summaryScore * SUMMARY_WEIGHT;
      } else if (item.questionsScore !== null) {
        semanticScore = item.questionsScore;
      } else {
        semanticScore = item.summaryScore!;
      }

      // Upvote adjustment with fixed reference normalization
      const upvotes = (item.payload.score as number) || 0;
      const normalizedUpvotes = Math.log10(1 + upvotes) / UPVOTE_REFERENCE;
      const finalScore =
        semanticScore * (1 - UPVOTE_WEIGHT) + normalizedUpvotes * UPVOTE_WEIGHT;

      return { ...item, semanticScore, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK);

  // Convert to LlamaIndex NodeWithScore JSON format
  const nodes = ranked.map((item) => {
    const p = item.payload;
    return {
      node: {
        text: (() => {
          try {
            const nc = JSON.parse(p._node_content as string);
            return nc.text || "";
          } catch {
            return "";
          }
        })(),
        metadata: {
          sectionSummary: p.sectionSummary,
          score: p.score,
          created: p.created,
          link: p.link,
          id: p.id,
          username: p.username,
          userFlair: p.userFlair,
        },
      },
      score: item.finalScore,
    };
  });

  return JSON.stringify(nodes);
}

// ── Index factories (LlamaIndex-based, for tools that still use them) ───────

export async function getCommentsIndex(
  params?: any,
  locale?: string,
  tags?: string[],
) {
  if (!commentsIndexCache) {
    const vectorStore = new QdrantVectorStore({
      url: qdrantUrl,
      collectionName: DEFAULT_V2_COLLECTION,
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
      url: qdrantUrl,
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
      url: qdrantUrl,
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
      url: qdrantUrl,
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
      url: qdrantUrl,
      collectionName: "detrans_studies",
    });
    studiesIndexCache = await VectorStoreIndex.fromVectorStore(vectorStore);
  }
  return studiesIndexCache;
}
