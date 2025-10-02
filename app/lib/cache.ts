// lib/cache.ts
import { db, detransQuestions, affirmQuestions } from "@/db";
import { eq } from "drizzle-orm";

export async function getCachedAnswer(
  mode: "detrans" | "affirm",
  question: string,
): Promise<string | undefined> {
  try {
    const questionsTable = mode === "detrans" ? detransQuestions : affirmQuestions;
    
    const result = await db
      .select({ finalResponse: questionsTable.finalResponse })
      .from(questionsTable)
      .where(eq(questionsTable.name, question))
      .limit(1);

    if (result.length > 0 && result[0].finalResponse) {
      return result[0].finalResponse;
    }
    
    return undefined;
  } catch (error) {
    console.error('Cache get error:', error);
    return undefined;
  }
}

export async function setCachedAnswer(
  mode: "detrans" | "affirm",
  question: string,
  answer: string,
): Promise<void> {
  try {
    const questionsTable = mode === "detrans" ? detransQuestions : affirmQuestions;
    
    await db
      .insert(questionsTable)
      .values({
        name: question,
        finalResponse: answer,
        viewsCount: 0,
        mostRecentlyAsked: new Date(),
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: questionsTable.name,
        set: {
          finalResponse: answer,
          mostRecentlyAsked: new Date(),
        },
      });
  } catch (error) {
    console.error('Cache set error:', error);
    // Don't throw - cache failures shouldn't break the application
  }
}

export async function incrementPageViews(mode: string, page: string) {
  const now = Math.floor(Date.now() / 1000); // unix timestamp

  const key = `${mode}:${page}`;

  const redis = await connectRedis();
  if (redis) {
    // Use a MULTI transaction to keep everything atomic
    const tx = redis.multi();

    // Increment pageviews and set/update other fields
    tx.hIncrBy(key, "pageviews", 1);
    tx.hSet(key, "last_updated", now);

    // Execute the transaction so far
    const results = await tx.exec();

    // hIncrBy result is at index 0
    const newViews = Number(results[0]);

    if (typeof newViews !== "number") {
      throw new Error("Unexpected result from hIncrBy");
    }
    // Now update sorted sets with the new values
    await redis
      .multi()
      .zAdd(`${mode}:page_views`, [{ score: newViews, value: page }])
      .zAdd(`${mode}:page_updates`, [{ score: now, value: page }])
      .exec();

    return newViews;
  }
}
