import { db, detransQuestions } from "@/db";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ question: string }> }
) {
  try {
    const { question } = await params;
    const questionName = decodeURIComponent(question);

    // Increment view count for this question
    await db.transaction(async (tx) => {
      await tx
        .insert(detransQuestions)
        .values({
          name: questionName,
          viewsCount: 1,
          mostRecentlyAsked: new Date(),
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: detransQuestions.name,
          set: {
            viewsCount: sql`${detransQuestions.viewsCount} + 1`,
            mostRecentlyAsked: new Date(),
          },
        });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error incrementing question views:", error);
    return NextResponse.json(
      { error: "Failed to increment views" },
      { status: 500 }
    );
  }
}
