import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { videos } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id, 10);
    
    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';
    
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1)
      .then((rows) => rows[0] as VideoWithTranslations | undefined);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const localizedVideo = {
      ...video,
      title: getLocalizedField(video.title, video.titleTranslation, locale),
      description: getLocalizedField(video.description, video.descriptionTranslation, locale),
      summary: getLocalizedField(video.summary, video.summaryTranslation, locale),
      bite: getLocalizedField(video.bite, video.biteTranslation, locale),
    };

    return NextResponse.json({ video: localizedVideo });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}
