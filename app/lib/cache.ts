// lib/cache.ts
import { db, detransQuestions } from "@/db";
import { eq, sql } from "drizzle-orm";

export async function getCachedAnswer(
  mode: "detrans" | "affirm",
  question: string,
): Promise<string | undefined> {
  try {
    const questionsTable = detransQuestions;

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
    console.error("Cache get error:", error);
    return undefined;
  }
}

export async function setCachedAnswer(
  mode: "detrans" | "affirm",
  question: string,
  answer: string,
): Promise<void> {
  try {
    const questionsTable = detransQuestions;

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
    console.error("Cache set error:", error);
    // Don't throw - cache failures shouldn't break the application
  }
}

export async function incrementQuestionViews(
  mode: "detrans" | "affirm",
  questionName: string,
): Promise<void> {
  try {
    const questionsTable = detransQuestions;

    await db.transaction(async (tx) => {
      // Insert or update question
      await tx
        .insert(questionsTable)
        .values({
          name: questionName,
          viewsCount: 1,
          mostRecentlyAsked: new Date(),
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: questionsTable.name,
          set: {
            viewsCount: sql`${questionsTable.viewsCount} + 1`,
            mostRecentlyAsked: new Date(),
          },
        });
    });
  } catch (error) {
    console.error("Question views increment error:", error);
    // Don't throw - analytics failures shouldn't break the application
  }
}
