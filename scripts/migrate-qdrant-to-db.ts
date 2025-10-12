import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransComments } from "../db/schema";

// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const sql = postgres(connectionString);
const db = drizzle(sql);

// Qdrant client
const qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });

async function migrateQdrantToDb() {
  console.log("Starting migration from Qdrant to detransComments table...");

  let nextPage = 0;
  let totalProcessed = 0;
  let totalInserted = 0;
  const batchSize = 1000;
  let batch: any[] = [];

  do {
    const res = await qdrantClient.scroll("default", {
      limit: 5000,
      with_payload: true,
      with_vector: false,
      offset: nextPage,
    });

    for (const point of res.points) {
      const payload = point.payload;

      if (!payload) continue;

      // Convert UTC timestamp to Date object
      const createdTimestamp = payload.created as number;
      const createdDate = new Date(createdTimestamp * 1000);

      const nodeContent = JSON.parse(payload._node_content as string);

      // Extract ID from link if not present in payload
      let commentId = payload.id as string;
      if (!commentId && payload.link) {
        const linkMatch = (payload.link as string).match(/\/([a-z0-9]+)\/?$/);
        if (linkMatch) {
          commentId = linkMatch[1];
        }
      }

      const commentData = {
        uuid: point.id.toString(), // Use Qdrant point ID as UUID
        text: nodeContent.text as string,
        summary: (payload.sectionSummary as string) || null,
        questions: (payload.questionsThisExcerptCanAnswer as string) || null,
        keywords: (payload.excerptKeywords as string) || null,
        username: (payload.username as string) || null,
        userFlair: (payload.userFlair as string) || null,
        link: (payload.link as string) || null,
        score: (payload.score as number) || null,
        created: createdDate,
        id: commentId,
        parentId: (payload.parent_id as string) || null,
        linkId: (payload.link_id as string) || null,
      };

      // Validate required fields
      if (!commentData.text || !commentData.id) {
        console.warn(`Skipping point with missing required fields:`, {
          hasText: !!commentData.text,
          hasId: !!commentData.id,
          link: commentData.link
        });
        continue;
      }


      batch.push(commentData);
      totalProcessed++;

      // Insert batch when it reaches batchSize
      if (batch.length >= batchSize) {
        try {
          const result = await db.insert(detransComments).values(batch).onConflictDoNothing({ target: detransComments.link });
          totalInserted += batch.length;
          console.log(
            `Inserted batch of ${batch.length} comments. Total inserted: ${totalInserted}`,
          );
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
      const result = await db.insert(detransComments).values(batch).onConflictDoNothing({ target: detransComments.link });
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
