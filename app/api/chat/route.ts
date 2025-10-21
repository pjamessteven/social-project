import { type Message, StreamingTextResponse, createStreamDataTransformer } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getCachedAnswer, setCachedAnswer } from "@/app/lib/cache";
import { replayCached } from "@/app/lib/replayCached";
import { getLogger } from "@/app/lib/logger";
import { OpenAI } from "@llamaindex/openai";
import { VectorStoreIndex, NodeWithScore, Metadata } from "llamaindex";
import { QdrantVectorStore } from "@llamaindex/qdrant";

import { initSettings } from "./app/settings";

initSettings();

// Retrieval configuration
const NARRATIVE_TOP_K = 8; // 6-10 from narrative collection
const COMMENT_TOP_M = 4; // 4 from comment collection
const FINAL_CHUNKS = 4; // 3-5 final chunks to inject

const llm = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  model: "deepseek/deepseek-chat-v3.1",
});

const PROMPT_TEMPLATE = `You are a compassionate, first-person assistant speaking only from the aggregated lived experiences of detransitioners.

Below are authentic excerpts written in the first person by people who have detransitioned:

{context}

Instructions:
- Use ONLY the information contained in the excerpts above
- Speak from the collective "I" perspective, as if drawing from these shared experiences
- If the excerpts do not address the user's question, say "I don't have lived experience around that specific point."
- Be compassionate and understanding
- Focus on personal experiences rather than medical advice
- Consider the conversation history when responding

{chat_history}

User: {question}
Assistant:`;

async function getRetrievers() {
  // Narrative collection (detrans users/stories)
  const narrativeStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "detrans_stories", // Assuming this collection exists for stories
  });
  
  // Comment collection
  const commentStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collectionName: "default", // Current comment collection
  });

  const narrativeIndex = await VectorStoreIndex.fromVectorStore(narrativeStore);
  const commentIndex = await VectorStoreIndex.fromVectorStore(commentStore);

  return {
    narrativeRetriever: narrativeIndex.asRetriever({ similarityTopK: NARRATIVE_TOP_K }),
    commentRetriever: commentIndex.asRetriever({ similarityTopK: COMMENT_TOP_M }),
  };
}

function calculateFirstPersonDensity(text: string): number {
  const firstPersonVerbs = [
    'I am', 'I was', 'I have', 'I had', 'I do', 'I did', 'I will', 'I would',
    'I feel', 'I felt', 'I think', 'I thought', 'I believe', 'I believed',
    'I started', 'I began', 'I decided', 'I realized', 'I experienced',
    'I went', 'I came', 'I saw', 'I knew', 'I understand', 'I remember'
  ];
  
  const lowerText = text.toLowerCase();
  const matches = firstPersonVerbs.filter(verb => lowerText.includes(verb.toLowerCase())).length;
  return matches / Math.max(text.split(' ').length, 1); // Density per word, avoid division by zero
}

function reRankNodes(nodes: NodeWithScore<Metadata>[]): NodeWithScore<Metadata>[] {
  return nodes
    .map(node => {
      const text = (node.node as any).text || '';
      const cosineSimilarity = node.score || 0;
      const firstPersonDensity = calculateFirstPersonDensity(text);
      const redditScore = node.node.metadata.score || 0;
      const normalizedRedditScore = Math.min(redditScore / 100, 1); // Normalize to 0-1
      
      // Weighted scoring: 60% cosine similarity, 30% first-person density, 10% reddit score
      const finalScore = (0.6 * cosineSimilarity) + (0.3 * firstPersonDensity) + (0.1 * normalizedRedditScore);
      
      return {
        ...node,
        score: finalScore,
      };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

function formatContext(nodes: NodeWithScore<Metadata>[]): string {
  return nodes
    .slice(0, FINAL_CHUNKS)
    .map((node, index) => {
      const text = (node.node as any).text || '';
      const username = node.node.metadata.username || 'Anonymous';
      return `--- Excerpt ${index + 1} (from ${username}) ---\n${text}\n`;
    })
    .join('\n');
}

function formatChatHistory(messages: Message[]): string {
  if (messages.length <= 1) return '';
  
  const history = messages.slice(0, -1).map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n');
  
  return `Previous conversation:\n${history}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    const { messages } = reqBody as { messages: Message[] };

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "user") {
      return NextResponse.json(
        { detail: "Messages cannot be empty and last message must be from user" },
        { status: 400 }
      );
    }

    const userQuestion = lastMessage.content;
    const logger = getLogger();

    // Create a cache key that includes recent context for better cache hits
    const contextKey = messages.length > 1 
      ? `${messages.slice(-3).map(m => m.content).join('|')}` 
      : userQuestion;

    // Check cache first
    const cachedAnswer = await getCachedAnswer("detrans", contextKey);
    if (cachedAnswer) {
      logger.info({
        originalQuestion: userQuestion,
        cacheKey: 'final_answer',
        mode: 'detrans',
        type: 'chat_cache'
      }, 'Chat cache hit');
      
      return new Response(replayCached(cachedAnswer), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    }

    logger.info({
      originalQuestion: userQuestion,
      cacheKey: 'final_answer',
      mode: 'detrans',
      type: 'chat_cache'
    }, 'Chat cache miss, generating response');

    // Retrieve from both collections
    const { narrativeRetriever, commentRetriever } = await getRetrievers();
    
    const [narrativeNodes, commentNodes] = await Promise.all([
      narrativeRetriever.retrieve({ query: userQuestion }),
      commentRetriever.retrieve({ query: userQuestion }),
    ]);

    // Combine and re-rank
    const allNodes = [...narrativeNodes, ...commentNodes];
    const reRankedNodes = reRankNodes(allNodes);
    const context = formatContext(reRankedNodes);
    const chatHistory = formatChatHistory(messages);

    // Generate response
    const prompt = PROMPT_TEMPLATE
      .replace('{context}', context)
      .replace('{chat_history}', chatHistory)
      .replace('{question}', userQuestion);

    const response = await llm.chat({
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let fullResponse = '';
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const delta = chunk.delta || '';
            fullResponse += delta;
            controller.enqueue(new TextEncoder().encode(delta));
          }
          
          // Cache the complete response
          await setCachedAnswer("detrans", contextKey, fullResponse);
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer()),
    );

  } catch (error) {
    console.error("Chat handler error:", error);
    return NextResponse.json(
      { detail: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
