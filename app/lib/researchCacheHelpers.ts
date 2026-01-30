// lib/cache.ts
import { db, detransQuestions } from "@/db";
import { eq, sql } from "drizzle-orm";

export async function incrementQuestionViews(
  questionName: string,
): Promise<void> {
  try {
    const questionsTable = detransQuestions;
    const name = questionName;

    await db.transaction(async (tx) => {
      // Insert or update question
      await tx
        .insert(questionsTable)
        .values({
          name,
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

/**
 * Get cached deep research answer by question name
 * Looks up the detrans_questions table where final responses are stored
 */
export async function getDeepResearchAnswer(
  question: string,
): Promise<string | undefined> {
  try {
    console.log(`[CACHE] Looking up deep research for question: "${question}"`);

    const name = question;

    // Deep research answers are stored in detrans_questions table
    // Match on the name column for lookup
    const result = await db
      .select({ finalResponse: detransQuestions.finalResponse })
      .from(detransQuestions)
      .where(eq(detransQuestions.name, name))
      .limit(1);

    if (result.length > 0 && result[0].finalResponse) {
      const finalResponse = result[0].finalResponse;
      console.log(
        `[CACHE] Found deep research result, length: ${finalResponse.length}`,
      );
      return finalResponse;
    }

    console.log(
      `[CACHE] No deep research result found for question: "${question}"`,
    );
    return undefined;
  } catch (error) {
    console.error("[CACHE] Deep research cache get error:", error);
    return undefined;
  }
}
