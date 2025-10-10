import { QdrantClient } from "@qdrant/js-client-rest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransComments } from "../db/schema";
import "dotenv/config";

// Database connection
const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);
const db = drizzle(sql);

// Qdrant client
const qdrantClient = new QdrantClient({ url: "http://localhost:6333" });

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

async function migrateQdrantToDb() {
  console.log("Starting migration from Qdrant to detransComments table...");

  let nextPage = 0;
  let totalProcessed = 0;
  let totalInserted = 0;
  const batchSize = 1000;
  let batch: any[] = [];

  do {
    const res = await fetchWithBackoff(
      async () =>
        qdrantClient.scroll("default", {
          limit: 5000,
          with_payload: true,
          with_vector: false,
          offset: nextPage,
        }),
      3,
      1000,
    );

    for (const point of res.points) {
      const payload = point.payload;
      
      if (!payload) continue;

      // Convert UTC timestamp to Date object
      const createdTimestamp = payload.created as number;
      const createdDate = new Date(createdTimestamp * 1000);

      const commentData = {
        text: payload.text as string,
        summary: (payload.summary as string) || null,
        questions: (payload.questionsThisExcerptCanAnswer as string) || null,
        keywords: (payload.keywords as string) || null,
        username: (payload.username as string) || null,
        userFlair: (payload.userFlair as string) || null,
        link: (payload.link as string) || null,
        score: (payload.score as number) || null,
        created: createdDate,
        id: payload.id as string,
        parentId: (payload.parent_id as string) || null,
        linkId: (payload.link_id as string) || null,
      };

      // Validate required fields
      if (!commentData.text || !commentData.id) {
        console.warn(`Skipping point with missing required fields:`, payload);
        continue;
      }

      batch.push(commentData);
      totalProcessed++;

      // Insert batch when it reaches batchSize
      if (batch.length >= batchSize) {
        try {
          await fetchWithBackoff(
            async () => db.insert(detransComments).values(batch),
            3,
            1000,
          );
          totalInserted += batch.length;
          console.log(`Inserted batch of ${batch.length} comments. Total inserted: ${totalInserted}`);
          batch = [];
        } catch (error) {
          console.error("Error inserting batch:", error);
          // Continue with next batch
          batch = [];
        }
      }
    }

    console.log(`Processed ${totalProcessed} points from Qdrant`);
    nextPage = res.next_page_offset as number;
  } while (nextPage);

  // Insert remaining batch
  if (batch.length > 0) {
    try {
      await fetchWithBackoff(
        async () => db.insert(detransComments).values(batch),
        3,
        1000,
      );
      totalInserted += batch.length;
      console.log(`Inserted final batch of ${batch.length} comments`);
    } catch (error) {
      console.error("Error inserting final batch:", error);
    }
  }

  console.log(`✅ Migration completed!`);
  console.log(`📊 Total processed: ${totalProcessed}`);
  console.log(`📊 Total inserted: ${totalInserted}`);

  await sql.end();
}

(async () => {
  try {
    await migrateQdrantToDb();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
})();
