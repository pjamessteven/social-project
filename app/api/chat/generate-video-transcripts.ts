import { QdrantVectorStore } from "@llamaindex/qdrant";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import "dotenv/config";
import {
  Document,
  IngestionPipeline,
  VectorStoreIndex,
  SentenceSplitter,
  SummaryExtractor,
  QuestionsAnsweredExtractor,
  KeywordExtractor,
} from "llamaindex";
import { initSettings } from "./app/settings";
import { KeywordPrompt, questionPrompt, SummaryPrompt } from "./utils/prompts";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { YtDlp } from "ytdlp-nodejs";

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

async function downloadVideoAudio(videoUrl: string, outputDir: string, videoId: number): Promise<string> {
  const ytdlp = new YtDlp();
  
  try {
    // Check if both yt-dlp and ffmpeg are installed
    const isInstalled = await ytdlp.checkInstallationAsync({ ffmpeg: true });
    if (!isInstalled) {
      console.log('yt-dlp or ffmpeg not found, downloading ffmpeg...');
      await ytdlp.downloadFFmpeg();
    }

    // Use absolute paths and ensure directory exists
    const absoluteOutputDir = path.resolve(outputDir);
    await fs.mkdir(absoluteOutputDir, { recursive: true });
    
    // Create a specific filename
    const outputFilename = `${videoId}.mp3`;
    const outputPath = path.join(absoluteOutputDir, outputFilename);

    console.log(`Downloading audio for ${videoUrl}`);
    
    // Simple download with minimal options - let yt-dlp handle format selection
    const result = await ytdlp.downloadAsync(videoUrl, {
      format: {
        filter: 'audioonly',
      },
      output: outputPath,
      onProgress: (progress) => {
        if (progress.percentage && !isNaN(progress.percentage)) {
          console.log(`Download progress: ${progress.percentage.toFixed(1)}%`);
        }
      }
    });

    // Check if file was actually created
    await fs.access(outputPath);
    console.log(`Successfully downloaded audio for: ${videoUrl}`);
    return outputPath;
    
  } catch (error) {
    console.error(`Failed to download audio for ${videoUrl}:`, error);
    throw error;
  }
}

async function transcribeAudio(audioPath: string): Promise<TranscriptSegment[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const audioBuffer = await fs.readFile(audioPath);
    // Convert Buffer to Uint8Array to ensure compatibility
    const audioUint8Array = new Uint8Array(audioBuffer);
    
    const response = await openai.audio.transcriptions.create({
      file: new File([audioUint8Array], path.basename(audioPath), {
        type: 'audio/mpeg'
      }),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Convert OpenAI response to our format
    const segments: TranscriptSegment[] = response.segments?.map(segment => ({
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
    })) || [];

    return segments;
  } catch (error) {
    console.error(`Failed to transcribe audio ${audioPath}:`, error);
    throw error;
  }
}

function chunkTranscript(segments: TranscriptSegment[], chunkDurationMinutes = 3): Array<{
  startTime: number;
  endTime: number;
  text: string;
}> {
  const chunkDurationSeconds = chunkDurationMinutes * 60;
  const overlapSeconds = 30; // 30 seconds overlap between chunks
  const chunks: Array<{ startTime: number; endTime: number; text: string }> = [];
  
  let segmentIndex = 0;
  
  while (segmentIndex < segments.length) {
    const chunkStartTime = segments[segmentIndex].start;
    const chunkEndTime = chunkStartTime + chunkDurationSeconds;
    
    // Collect segments for this chunk
    const currentChunk: TranscriptSegment[] = [];
    let currentIndex = segmentIndex;
    
    while (currentIndex < segments.length && segments[currentIndex].start < chunkEndTime) {
      currentChunk.push(segments[currentIndex]);
      currentIndex++;
    }
    
    if (currentChunk.length > 0) {
      const text = currentChunk.map(s => s.text).join(' ');
      chunks.push({
        startTime: chunkStartTime,
        endTime: currentChunk[currentChunk.length - 1].end,
        text: text,
      });
    }
    
    // Find the next starting point with overlap
    const nextStartTime = chunkEndTime - overlapSeconds;
    
    // Find the segment that starts closest to the overlap point
    while (segmentIndex < segments.length && segments[segmentIndex].start < nextStartTime) {
      segmentIndex++;
    }
    
    // If we didn't advance, move forward by at least one segment to avoid infinite loop
    if (segmentIndex === currentIndex - currentChunk.length) {
      segmentIndex++;
    }
  }
  
  return chunks;
}

async function generateDatasource() {
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
  const tempDir = path.join(process.cwd(), 'temp_audio');
  await fs.mkdir(tempDir, { recursive: true });

  let processedCount = 0;

  for (const video of unprocessedVideos) {
    try {
      console.log(`Processing video: ${video.title}`);
      
      // Download audio
      const fullAudioPath = await downloadVideoAudio(video.url, tempDir, video.id);
      
      // Transcribe audio
      console.log(`Transcribing audio for: ${video.title}`);
      const segments = await fetchWithBackoff(
        () => transcribeAudio(fullAudioPath),
        3,
        2000
      );

      // Save full transcript to database
      const fullTranscript = segments.map(s => s.text).join(' ');
      await db
        .update(videos)
        .set({ 
          transcript: fullTranscript,
          updatedAt: new Date()
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

        await fetchWithBackoff(
          async () => index.insertNodes(nodes),
          5,
          500,
        );

        console.log(`Created ${documents.length} document chunks for video: ${video.title}`);
      }

      // Clean up audio file
      try {
        await fs.unlink(fullAudioPath);
      } catch (cleanupError) {
        console.warn(`Failed to clean up audio file ${fullAudioPath}:`, cleanupError);
      }

      // Mark as successfully processed only after everything completes
      await db
        .update(videos)
        .set({ 
          processed: true,
          updatedAt: new Date()
        })
        .where(eq(videos.id, video.id));

      processedCount++;
      console.log(`Processed ${processedCount}/${unprocessedVideos.length} videos`);

    } catch (error) {
      console.error(`Failed to process video ${video.title}:`, error);
      
      // Try to clean up any partial downloads
      try {
        const files = await fs.readdir(tempDir);
        const partialFiles = files.filter(f => f.startsWith(video.id.toString()));
        for (const file of partialFiles) {
          await fs.unlink(path.join(tempDir, file));
        }
      } catch (cleanupError) {
        console.warn(`Failed to clean up partial downloads for video ${video.id}:`, cleanupError);
      }
      
      // Don't mark as processed if it failed - let it retry next time
    }
  }

  // Clean up temp directory
  try {
    await fs.rmdir(tempDir);
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
    await generateDatasource();
  }
})();
