import { QdrantVectorStore } from "@llamaindex/qdrant";
import { db } from "@/db";
import { detransUsers, detransUserTags, detransTags } from "@/db/schema";
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

async function generateDatasource() {
  console.log(`Generating detrans stories datasource...`);

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

  // Fetch all users with their experience stories and associated metadata
  const usersWithStories = await db
    .select({
      username: detransUsers.username,
      experience: detransUsers.experience,
      sex: detransUsers.sex,
      transitionAge: detransUsers.transitionAge,
      detransitionAge: detransUsers.detransitionAge,
      transitionReasonId: detransUsers.transitionReasonId,
      detransitionReasonId: detransUsers.detransitionReasonId,
      transitionReason: sql<string>`tr.name`,
      detransitionReason: sql<string>`dr.name`,
      tags: sql<string[]>`COALESCE(array_agg(DISTINCT ${detransTags.name}) FILTER (WHERE ${detransTags.name} IS NOT NULL), ARRAY[]::text[])`,
    })
    .from(detransUsers)
    .leftJoin(
      sql`${detransTags} tr`,
      eq(detransUsers.transitionReasonId, sql`tr.id`)
    )
    .leftJoin(
      sql`${detransTags} dr`, 
      eq(detransUsers.detransitionReasonId, sql`dr.id`)
    )
    .leftJoin(detransUserTags, eq(detransUsers.username, detransUserTags.username)) 
    .leftJoin(detransTags, eq(detransUserTags.tagId, detransTags.id))
    .where(sql`${detransUsers.experience} IS NOT NULL AND ${detransUsers.experience} != ''`)
    .groupBy(
      detransUsers.username,
      detransUsers.experience,
      detransUsers.transitionAge,
      detransUsers.detransitionAge,
      detransUsers.transitionReasonId,
      detransUsers.detransitionReasonId,
      sql`tr.name`,
      sql`dr.name`
    );

  console.log(`Found ${usersWithStories.length} users with experience stories`);

  let index;
  try {
    index = await VectorStoreIndex.fromVectorStore(vectorStore);
  } catch (error) {
    console.error("Failed to connect to Qdrant vector store:", error);
    console.error("Make sure Qdrant is running and accessible at:", qdrantUrl);
    process.exit(1);
  }

  let processedCount = 0;

  // Process users in batches
  const batchSize = 10;
  for (let i = 0; i < usersWithStories.length; i += batchSize) {
    const batch = usersWithStories.slice(i, i + batchSize);
    const documents: Document[] = [];

    for (const user of batch) {
      if (!user.experience) continue;

      const doc = new Document({
        text: user.experience,
        metadata: {
          sex: user.sex,
          username: user.username,
          tags: user.tags || [],
          transitionReason: user.transitionReason || null,
          detransitionReason: user.detransitionReason || null,
          transitionAge: user.transitionAge || null,
          detransitionAge: user.detransitionAge || null,
          type: "user_story",
        },
      });

      documents.push(doc);
    }

    if (documents.length > 0) {
      // Process the batch with retry logic
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

      processedCount += documents.length;
      console.log(`Processed ${processedCount}/${usersWithStories.length} user stories`);
    }
  }

  console.log("Detrans stories datasource successfully generated.");
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
