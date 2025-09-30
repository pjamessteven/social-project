import { extractQuestionsFromString } from "@/app/lib/extractQuestions";
import { QdrantVectorStore } from "@llamaindex/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";
import fs from "fs";
import {
  Document,
  IngestionPipeline,
  KeywordExtractor,
  QuestionsAnsweredExtractor,
  SummaryExtractor,
  VectorStoreIndex,
} from "llamaindex";
import readline from "readline";
import { initSettings } from "./app/settings";
import { KeywordPrompt, questionPrompt, SummaryPrompt } from "./prompts";

// Checkpoint helpers
const checkpointFile = "checkpoint.json";
function saveCheckpoint(lineNumber: number) {
  fs.writeFileSync(checkpointFile, JSON.stringify({ lineNumber }));
}
function loadCheckpoint(): number {
  if (fs.existsSync(checkpointFile)) {
    return JSON.parse(fs.readFileSync(checkpointFile, "utf8")).lineNumber || 0;
  }
  return 0;
}

async function fetchWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 500, // initial delay in ms
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) {
        throw err; // out of retries, rethrow the error
      }

      const backoff = delay * Math.pow(2, attempt); // exponential backoff
      console.warn(
        `Attempt ${attempt + 1} failed. Retrying in ${backoff}ms...`,
        err,
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt++;
    }
  }

  // should never reach here
  throw new Error("Unexpected error in fetchWithBackoff");
}

async function generateDatasource() {
  console.log(`Generating storage context...`);

  const vectorStore = new QdrantVectorStore({
    url: "http://localhost:6333",
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

  // JSONL streamer with checkpoint support - now processes from end to start
  async function* streamJsonl(
    filePath: string,
    batchSize = 100,
    startLine = 0,
    seenIds: Set<string>,
  ) {
    // Read all lines first to determine total count
    const allLines: string[] = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.trim()) {
        allLines.push(line);
      }
    }

    const totalLines = allLines.length;
    console.log(`Total lines in file: ${totalLines}`);
    console.log(`Starting from reverse line: ${startLine}`);

    // Process from end to start
    let batch: Document[] = [];

    for (let i = totalLines - 1 - startLine; i >= 0; i--) {
      const line = allLines[i];
      const obj = JSON.parse(line);

      // skip short or low-score comments
      if (obj.body.length <= 250 || obj.score <= 2) continue;

      // Check if we've already seen this permalink
      if (seenIds.has(obj.id)) {
        console.log(
          `Skipping id: ${obj.id} at reverse line ${totalLines - 1 - i}`,
        );
        continue;
      }

      const doc = new Document({
        text: obj.body,
        metadata: {
          username: obj.author,
          userFlair: obj.author_flair_text,
          link: obj.permalink,
          score: obj.score,
          created: obj.created_utc,
          id: obj.id,
          parent_id: obj.parent_id, // for comments
          link_id: obj.link_id, // for comments
          type: "comment",
        },
      });

      batch.push(doc);

      if (batch.length >= batchSize) {
        yield { batch, lineNumber: totalLines - 1 - i }; // reverse line number
        batch = [];
      }
    }

    // yield remaining batch if any
    if (batch.length > 0) {
      yield { batch, lineNumber: totalLines - 1 }; // last reverse line number
    }
  }

  const index = await VectorStoreIndex.fromVectorStore(vectorStore);
  const startLine = loadCheckpoint();
  console.log(`▶️ Resuming from reverse line ${startLine}`);

  /* get existing urls to avoid re-adding
  const qdrantClient = new QdrantClient({ url: "http://localhost:6333" });

  let nextPage = 0;
  const seen = new Set<string>();
  let totalExisting = 0;

  do {
    const res = await fetchWithBackoff(async () =>
      qdrantClient.scroll("default", {
        limit: 50000, // adjust batch size
        with_payload: true,
        with_vector: false,
        offset: nextPage,
      }),
    );

    for (const point of res.points) {
      const id = point.payload?.link as string | undefined;

      if (!id) continue;

      seen.add(id);
      totalExisting++;
    }

    nextPage = res.next_page_offset as number;
  } while (nextPage);

  console.log(`Found ${totalExisting} existing documents in database`);
  */

  const seen = new Set<string>();
  try {
    for await (const { batch, lineNumber } of await fetchWithBackoff(async () =>
      streamJsonl("data/r_detrans_comments.jsonl", 100, startLine, seen),
    )) {
      // Process the batch with retry logic for network operations
      const nodes = await fetchWithBackoff(
        async () => pipeline.run({ documents: batch }),
        3, // fewer retries for LLM operations
        1000, // longer initial delay
      );

      await fetchWithBackoff(
        async () => index.insertNodes(nodes),
        5, // more retries for database operations
        500,
      );

      for (const node of nodes) {
        console.log(node.metadata);
      }
      console.log(`Inserted batch of ${batch.length} docs`);
      console.log(`Processed up to reverse line ${lineNumber}`);
      saveCheckpoint(lineNumber);
    }
  } catch (error) {
    console.error("Fatal error during processing:", error);
    console.log(
      "Checkpoint saved. Run the command again to resume from the last saved position.",
    );
    process.exit(1);
  }

  console.log("Storage context successfully generated.");
}

async function clearDb() {
  const client = new QdrantClient({ url: "http://localhost:6333" });

  await fetchWithBackoff(
    async () => client.deleteCollection("default"),
    3,
    1000,
  );
  console.log("cleared db");
  saveCheckpoint(0);
}

async function deduplicateDb() {
  const client = new QdrantClient({ url: "http://localhost:6333" });

  const seen = new Set<string>();
  const toDelete: number[] = [];

  let nextPage = 0;

  do {
    const res = await fetchWithBackoff(
      async () =>
        client.scroll("default", {
          limit: 50000, // adjust batch size
          with_payload: true,
          with_vector: false,
          offset: nextPage,
        }),
      3,
      1000,
    );

    for (const point of res.points) {
      const id = point.payload?.id as string | undefined;

      if (!id) continue;

      if (seen.has(id)) {
        // Duplicate → mark for deletion
        toDelete.push(point.id as number);
      } else {
        seen.add(id);
      }
    }

    nextPage = res.next_page_offset as number;
  } while (nextPage);

  if (toDelete.length > 0) {
    /*
    await fetchWithBackoff(
      async () =>
        client.delete("default", {
          points: toDelete,
        }),
      3,
      1000,
    );
    */
    console.log(`Deleted ${toDelete.length} duplicates`);
  } else {
    console.log("No duplicates found 🎉");
  }
}

async function exportQuestions() {
  const client = new QdrantClient({ url: "http://localhost:6333" });

  const seenQuestions = new Set<string>();
  const questionsData: Array<{
    question: string;
    point_id: number | string;
  }> = [];

  let nextPage = 0;
  let totalProcessed = 0;

  console.log("Starting question extraction...");

  do {
    const res = await fetchWithBackoff(
      async () =>
        client.scroll("default", {
          limit: 5000, // adjust batch size
          with_payload: true,
          with_vector: false,
          offset: nextPage,
        }),
      3,
      1000,
    );

    for (const point of res.points) {
      const comment_id = point.payload?.id as string | undefined;
      const point_id = point.id;

      const questionsString = point.payload
        ?.questionsThisExcerptCanAnswer as string;

      if (questionsString && comment_id) {
        const questions = extractQuestionsFromString(questionsString);

        for (const question of questions) {
          const normalizedQuestion = question.trim().toLowerCase();

          // Check for duplicates (case-insensitive)
          if (!seenQuestions.has(normalizedQuestion)) {
            seenQuestions.add(normalizedQuestion);
            questionsData.push({
              question: question.trim(),
              point_id,
            });
          }
        }
      }

      totalProcessed++;
    }

    console.log(
      `Processed ${totalProcessed} documents, found ${questionsData.length} unique questions`,
    );
    nextPage = res.next_page_offset as number;
  } while (nextPage);

  // Export to JSONL file
  const outputFile = "exported_questions.jsonl";
  const writeStream = fs.createWriteStream(outputFile);

  for (const questionData of questionsData) {
    writeStream.write(JSON.stringify(questionData) + "\n");
  }

  writeStream.end();

  console.log(
    `✅ Exported ${questionsData.length} unique questions to ${outputFile}`,
  );
  console.log(`📊 Processed ${totalProcessed} total documents`);
}

/*
async function filterDb() {
  const client = new QdrantVectorStore({ url: "http://localhost:6333" });

  const seen = new Set<string>();
  const toDelete: number[] = [];

  let nextPage = 0;

  do {
    const res = await fetchWithBackoff(
      async () =>
        client.scroll("default", {
          limit: 50000, // adjust batch size
          with_payload: true,
          with_vector: false,
          offset: nextPage,
        }),
      3,
      1000,
    );

    for (const point of res.points) {
      const score = point.payload?.score as number;

      // remove low scores
      if (score <= 2) {
        toDelete.push(point.id as number);
      }
    }

    nextPage = res.next_page_offset;
  } while (nextPage);

  if (toDelete.length > 0) {
    await fetchWithBackoff(
      async () =>
        client.delete("default", {
          points: toDelete,
        }),
      3,
      1000,
    );
    console.log(`Filtered out ${toDelete.length}`);
  } else {
    console.log("No duplicates found 🎉");
  }
}


*/
(async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  initSettings();

  if (command === "datasource") {
    await generateDatasource();
  } else if (command === "reset") {
    await clearDb();
  } else if (command === "deduplicate") {
    await deduplicateDb();
  } else if (command === "filter") {
    //await filterDb();
  } else if (command === "export-questions") {
    await exportQuestions();
  } else {
    console.error(
      'Invalid command. Please use "datasource" or "ui". Running "datasource" by default.',
    );
    await generateDatasource(); // Default behavior or could throw an error
  }
})();
