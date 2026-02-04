#!/usr/bin/env tsx

import { QdrantVectorStore } from "@llamaindex/qdrant";
import "dotenv/config";
import { and, eq, isNotNull } from "drizzle-orm";
import fsp from "fs/promises";
import {
  Document,
  IngestionPipeline,
  KeywordExtractor,
  QuestionsAnsweredExtractor,
  SummaryExtractor,
  VectorStoreIndex,
} from "llamaindex";
import os from "os";
import path from "path";
import { initSettings } from "../app/api/chat/app/settings";
import {
  KeywordPrompt,
  questionPrompt,
  SummaryPrompt,
} from "../app/api/chat/utils/prompts";
import { db } from "../db";
import { videos } from "../db/schema";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

async function fetchWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 500,
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }

      const backoff = delay * Math.pow(2, attempt);
      console.warn(
        `Attempt ${attempt + 1} failed. Retrying in ${backoff}ms...`,
        err,
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt++;
    }
  }

  throw new Error("Unexpected error in fetchWithBackoff");
}

function chunkTranscript(
  segments: TranscriptSegment[],
  chunkDurationMinutes = 3,
): Array<{
  startTime: number;
  endTime: number;
  text: string;
}> {
  const chunkDurationSeconds = chunkDurationMinutes * 60;
  const overlapSeconds = 30; // 30 seconds overlap between chunks
  const chunks: Array<{ startTime: number; endTime: number; text: string }> =
    [];

  let segmentIndex = 0;

  while (segmentIndex < segments.length) {
    const chunkStartTime = segments[segmentIndex].start;
    const chunkEndTime = chunkStartTime + chunkDurationSeconds;

    // Collect segments for this chunk
    const currentChunk: TranscriptSegment[] = [];
    let currentIndex = segmentIndex;

    while (
      currentIndex < segments.length &&
      segments[currentIndex].start < chunkEndTime
    ) {
      currentChunk.push(segments[currentIndex]);
      currentIndex++;
    }

    if (currentChunk.length > 0) {
      const text = currentChunk.map((s) => s.text).join(" ");
      chunks.push({
        startTime: chunkStartTime,
        endTime: currentChunk[currentChunk.length - 1].end,
        text: text,
      });
    }

    // Find the next starting point with overlap
    const nextStartTime = chunkEndTime - overlapSeconds;

    // Find the segment that starts closest to the overlap point
    while (
      segmentIndex < segments.length &&
      segments[segmentIndex].start < nextStartTime
    ) {
      segmentIndex++;
    }

    // If we didn't advance, move forward by at least one segment to avoid infinite loop
    if (segmentIndex === currentIndex - currentChunk.length) {
      segmentIndex++;
    }
  }

  return chunks;
}

async function processVideos() {
  console.log(`Generating video transcripts datasource...`);

  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  console.log(`Connecting to Qdrant at: ${qdrantUrl}`);

  const vectorStore = new QdrantVectorStore({
    url: qdrantUrl,
    collectionName: "detrans_video_transcripts",
  });

  const pipeline = new IngestionPipeline({
    transformations: [
      new SummaryExtractor({ promptTemplate: SummaryPrompt }),
      new QuestionsAnsweredExtractor({
        questions: 5,
        promptTemplate: questionPrompt,
      }),
      new KeywordExtractor({
        keywords: 10,
        promptTemplate: KeywordPrompt,
      }),
    ],
  });

  // Fetch all unprocessed videos with transcripts
  const unprocessedVideos = await db
    .select()
    .from(videos)
    .where(and(eq(videos.processed, false), isNotNull(videos.transcript)));

  console.log(`Found ${unprocessedVideos.length} unprocessed videos`);

  if (unprocessedVideos.length === 0) {
    console.log("No unprocessed videos found.");
    return;
  }

  let index;
  try {
    index = await VectorStoreIndex.fromVectorStore(vectorStore);
  } catch (error) {
    console.error("Failed to connect to Qdrant vector store:", error);
    console.error("Make sure Qdrant is running and accessible at:", qdrantUrl);
    process.exit(1);
  }

  // Create temp directory for audio files
  // Use system temp directory for cross-platform compatibility
  const tempDir = path.join(os.tmpdir(), "temp_audio");
  await fsp.mkdir(tempDir, { recursive: true });

  let processedCount = 0;

  for (const video of unprocessedVideos) {
    try {
      const { segments } = JSON.parse(video.transcript!);
      // Chunk transcript and create documents
      const chunks = chunkTranscript(segments);
      const documents: Document[] = [];

      for (const chunk of chunks) {
        const doc = new Document({
          text: chunk.text,
          metadata: {
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            title: video.title,
            url: video.url,
            author: video.author,
            sex: video.sex,
            type: "video_transcript",
            videoId: video.id,
          },
        });

        documents.push(doc);
      }

      if (documents.length > 0) {
        // Process the documents with retry logic
        const nodes = await fetchWithBackoff(
          async () => pipeline.run({ documents }),
          3,
          1000,
        );

        await fetchWithBackoff(async () => index.insertNodes(nodes), 5, 500);

        console.log(
          `Created ${documents.length} document chunks for video: ${video.title}`,
        );
      }

      // Mark as successfully processed only after everything completes
      await db
        .update(videos)
        .set({
          processed: true,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, video.id));

      processedCount++;
      console.log(
        `Processed ${processedCount}/${unprocessedVideos.length} videos`,
      );
    } catch (error) {
      console.error(`Failed to process video ${video.title}:`, error);

      // Try to clean up any partial downloads
      try {
        const files = await fsp.readdir(tempDir);
        const partialFiles = files.filter((f) =>
          f.startsWith(video.id.toString()),
        );
        for (const file of partialFiles) {
          await fsp.unlink(path.join(tempDir, file));
        }
      } catch (cleanupError) {
        console.warn(
          `Failed to clean up partial downloads for video ${video.id}:`,
          cleanupError,
        );
      }

      // Don't mark as processed if it failed - let it retry next time
    }
  }

  // Clean up temp directory
  try {
    await fsp.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to remove temp directory: ${error}`);
  }

  console.log("Video transcripts datasource successfully generated.");
}

(async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  initSettings();

  if (command === "ui") {
    console.error("This project doesn't use any custom UI.");
    return;
  } else {
    if (command !== "datasource") {
      console.error(
        `Unrecognized command: ${command}. Generating datasource by default.`,
      );
    }
    await processVideos();
  }
})();
