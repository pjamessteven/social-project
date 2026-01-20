#!/usr/bin/env tsx

import { OpenAI as LlamaIndexOpenAI } from "@llamaindex/openai";
import { QdrantVectorStore } from "@llamaindex/qdrant";
import "dotenv/config";
import { eq } from "drizzle-orm";
import fs from "fs";
import fsp from "fs/promises";
import {
  Document,
  IngestionPipeline,
  KeywordExtractor,
  QuestionsAnsweredExtractor,
  SummaryExtractor,
  VectorStoreIndex,
} from "llamaindex";
import OpenAI from "openai";
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

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

async function downloadVideoAudio(
  videoUrl: string,
  outputDir: string,
  videoId: number,
): Promise<string> {
  const { exec: execCallback } = await import("child_process");
  const { promisify } = await import("util");
  const exec = promisify(execCallback);

  try {
    // Use absolute paths and ensure directory exists
    const absoluteOutputDir = path.resolve(outputDir);
    await fsp.mkdir(absoluteOutputDir, { recursive: true });

    // Create downloads subdirectory
    const downloadsDir = path.join(absoluteOutputDir, "downloads");
    await fsp.mkdir(downloadsDir, { recursive: true });

    console.log(`Downloading audio for ${videoUrl}`);

    // Use yt-dlp to download audio directly as MP3
    const mp3FileName = `video_${videoId}_%(title)s.%(ext)s`;
    const outputTemplate = path.join(downloadsDir, mp3FileName);

    // Use yt-dlp to extract audio directly to MP3 with low quality for voice
    const ytdlpCommand = [
      "yt-dlp",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "32K",
      "--postprocessor-args",
      '"-ac 1 -ar 16000"', // mono, 16kHz sample rate
      "--output",
      `"${outputTemplate}"`,
      `"${videoUrl}"`,
      "--cookies",
      "/tmp/cookies.txt",
    ].join(" ");

    console.log("Running yt-dlp command:", ytdlpCommand);

    try {
      const { stdout, stderr } = await exec(ytdlpCommand);
      console.log("yt-dlp stdout:", stdout);
      if (stderr) console.log("yt-dlp stderr:", stderr);
    } catch (ytdlpError) {
      console.error("yt-dlp command failed:", ytdlpError);
      throw new Error(`Failed to download audio: ${ytdlpError}`);
    }

    // Find the downloaded MP3 file
    const files = await fsp.readdir(downloadsDir);
    console.log("Files in downloads directory:", files);

    // Look for MP3 files that match our pattern
    const mp3Files = files.filter(
      (f) => f.startsWith(`video_${videoId}_`) && f.endsWith(".mp3"),
    );
    console.log("MP3 files found:", mp3Files);

    if (mp3Files.length === 0) {
      throw new Error(`No MP3 files found in ${downloadsDir} after download`);
    }

    // Get the most recently created file (in case there are multiple)
    let newestFile = mp3Files[0];
    let newestTime = 0;

    for (const file of mp3Files) {
      const filePath = path.join(downloadsDir, file);
      const stats = await fsp.stat(filePath);
      if (stats.mtime.getTime() > newestTime) {
        newestTime = stats.mtime.getTime();
        newestFile = file;
      }
    }

    const mp3Path = path.join(downloadsDir, newestFile);
    console.log("Downloaded MP3 file path:", mp3Path);

    // Verify the file exists
    await fsp.access(mp3Path);

    console.log(`Successfully downloaded MP3: ${mp3Path}`);
    return mp3Path;
  } catch (error) {
    console.error(`Failed to download audio for ${videoUrl}:`, error);
    throw error;
  }
}

async function transcribeAudio(
  audioPath: string,
): Promise<{ segments: TranscriptSegment[]; fullResponse: any }> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 600000, // 10 minutes timeout
  });

  try {
    console.log(`Reading audio file: ${audioPath}`);
    const audioBuffer = await fsp.readFile(audioPath);
    const fileSizeMB = audioBuffer.length / (1024 * 1024);
    console.log(`File size: ${fileSizeMB.toFixed(2)}MB`);

    console.log(`Starting Whisper transcription...`);
    const startTime = Date.now();

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(
      `Transcription completed in ${duration.toFixed(1)}s, ${response.segments?.length || 0} segments`,
    );

    // Convert OpenAI response to our format
    const segments: TranscriptSegment[] =
      response.segments?.map((segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
      })) || [];

    return { segments, fullResponse: response };
  } catch (error) {
    console.error(`Failed to transcribe audio ${audioPath}:`, error);
    throw error;
  }
}

async function generateVideoSummary(
  title: string,
  author: string,
  transcript: string,
): Promise<string> {
  // Create Kimi AI client using OpenRouter
  const kimi = new LlamaIndexOpenAI({
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "moonshotai/kimi-k2-0905:exacto",
  });

  try {
    console.log(`Generating summary for video: ${title}`);

    const prompt = `Please generate a concise summary of the following video transcript.

Video Title: ${title}
Author: ${author}

Transcript:
${transcript}

Instructions:
1. Create a summary for this video that captures the main points and key insights
2. Focus on the most important information and themes
3. Write in clear, concise language
4. Do not include timestamps or technical details
5. Keep the summary under 300 words

Summary:`;

    const response = await kimi.chat({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
    });

    const summary = response.message.content?.toString().trim() || "";

    if (!summary) {
      throw new Error(
        "Failed to generate summary - empty response from Kimi AI",
      );
    }

    console.log(`Successfully generated summary for: ${title}`);
    return summary;
  } catch (error) {
    console.error(`Failed to generate summary for video ${title}:`, error);
    throw error;
  }
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

  // Fetch all unprocessed videos
  const unprocessedVideos = await db
    .select()
    .from(videos)
    .where(eq(videos.processed, false));

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
      console.log(`Processing video: ${video.title}`);

      // Download audio
      const fullAudioPath = await downloadVideoAudio(
        video.url,
        tempDir,
        video.id,
      );

      // Transcribe audio
      console.log(`Transcribing audio for: ${video.title}`);
      const { segments, fullResponse } = await fetchWithBackoff(
        () => transcribeAudio(fullAudioPath),
        2, // Reduce retries since transcription takes long
        5000, // Longer delay between retries
      );

      // Save full transcript response to database as JSON
      const fullTranscriptResponse = fullResponse.text;

      // Generate summary using Kimi AI
      console.log(`Generating summary for: ${video.title}`);
      const summary = await fetchWithBackoff(
        () =>
          generateVideoSummary(
            video.title,
            video.author,
            fullTranscriptResponse,
          ),
        3,
        1000,
      );

      // Update database with both transcript and summary
      await db
        .update(videos)
        .set({
          transcript: fullTranscriptResponse,
          description: summary,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, video.id));

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

      // Clean up audio file
      try {
        await fsp.unlink(fullAudioPath);
      } catch (cleanupError) {
        console.warn(
          `Failed to clean up audio file ${fullAudioPath}:`,
          cleanupError,
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
