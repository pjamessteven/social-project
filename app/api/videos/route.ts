import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { videos } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const allVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.processed, true))
      .orderBy(desc(videos.createdAt));

    return NextResponse.json({
      videos: allVideos,
      count: allVideos.length
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
