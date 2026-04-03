import { VALID_LOCALES } from "@/app/lib/constants";
import { sanitizeLocale } from "@/app/lib/sanitization";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

interface Video {
  id: number;
  title: string;
  author: string;
  sex: "m" | "f";
  url: string;
  type: string;
  processed: boolean;
  transcript: string | null;
  description: string | null;
  summary: string | null;
  bite: string | null;
  duration: number | null;
  date: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = sanitizeLocale(
      searchParams.get("locale"),
      VALID_LOCALES,
      "en",
    );

    // Use PostgreSQL JSON operators to extract only the requested locale
    // COALESCE returns the first non-null value (translation -> default)
    const allVideos = await db
      .select({
        id: videos.id,
        title: sql<string>`COALESCE((${videos.titleTranslation})::jsonb->>${locale}, ${videos.title})`,
        author: videos.author,
        sex: videos.sex,
        url: videos.url,
        type: videos.type,
        processed: videos.processed,
        transcript: videos.transcript,
        description: sql<
          string | null
        >`COALESCE((${videos.descriptionTranslation})::jsonb->>${locale}, ${videos.description})`,
        summary: sql<
          string | null
        >`COALESCE((${videos.summaryTranslation})::jsonb->>${locale}, ${videos.summary})`,
        bite: sql<
          string | null
        >`COALESCE((${videos.biteTranslation})::jsonb->>${locale}, ${videos.bite})`,
        duration: videos.duration,
        date: videos.date,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
      })
      .from(videos)
      .where(eq(videos.processed, true))
      .orderBy(desc(videos.createdAt));

    return NextResponse.json({
      videos: allVideos as Video[],
      count: allVideos.length,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 },
    );
  }
}
