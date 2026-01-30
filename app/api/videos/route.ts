import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { videos } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

interface VideoWithTranslations {
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
  descriptionTranslation: string | null;
  summaryTranslation: string | null;
  biteTranslation: string | null;
  titleTranslation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function getLocalizedField(
  defaultValue: string | null,
  translationsJson: string | null,
  locale: string
): string | null {
  if (!translationsJson) return defaultValue;
  
  try {
    const translations = JSON.parse(translationsJson) as Record<string, string>;
    return translations[locale] || defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';
    
    const allVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.processed, true))
      .orderBy(desc(videos.createdAt));

    const localizedVideos = (allVideos as VideoWithTranslations[]).map((video) => ({
      ...video,
      title: getLocalizedField(video.title, video.titleTranslation, locale),
      description: getLocalizedField(video.description, video.descriptionTranslation, locale),
      summary: getLocalizedField(video.summary, video.summaryTranslation, locale),
      bite: getLocalizedField(video.bite, video.biteTranslation, locale),
    }));

    return NextResponse.json({
      videos: localizedVideos,
      count: localizedVideos.length
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
