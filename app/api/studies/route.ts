import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studies } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

interface StudyWithTranslations {
  id: number;
  headline: string | null;
  title: string | null;
  authors: string | null;
  description: string | null;
  year: number | null;
  url: string;
  displayUrl: string;
  journal: string | null;
  headlineTranslation: string | null;
  titleTranslation: string | null;
  descriptionTranslation: string | null;
  journalTranslation: string | null;
  processed: boolean;
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
    
    const allStudies = await db
      .select()
      .from(studies)
      .where(eq(studies.processed, true))
      .orderBy(desc(studies.year));

    const localizedStudies = (allStudies as StudyWithTranslations[]).map((study) => ({
      id: study.id,
      headline: getLocalizedField(study.headline, study.headlineTranslation, locale),
      title: getLocalizedField(study.title, study.titleTranslation, locale),
      authors: study.authors,
      description: getLocalizedField(study.description, study.descriptionTranslation, locale),
      year: study.year,
      url: study.url,
      displayUrl: study.displayUrl,
      journal: getLocalizedField(study.journal, study.journalTranslation, locale),
    }));

    return NextResponse.json({
      studies: localizedStudies,
      count: localizedStudies.length
    });
  } catch (error) {
    console.error('Error fetching studies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch studies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, title: suggestedTitle } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate suggested title if provided
    if (suggestedTitle !== undefined && (typeof suggestedTitle !== 'string' || suggestedTitle.length > 500)) {
      return NextResponse.json(
        { error: 'Invalid title format' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Generate displayUrl from the URL
    let displayUrl = url;
    try {
      const urlObj = new URL(url);
      displayUrl = urlObj.hostname + urlObj.pathname;
    } catch {
      displayUrl = url;
    }

    // Insert the study with just URL and processed = false
    // If user provided a suggested title, store it in headline field
    const result = await db.insert(studies).values({
      url,
      displayUrl,
      headline: suggestedTitle || null,
      processed: false,
    }).returning();

    return NextResponse.json({
      success: true,
      study: result[0],
      message: 'Study submitted successfully and is awaiting review'
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting study:', error);
    return NextResponse.json(
      { error: 'Failed to submit study' },
      { status: 500 }
    );
  }
}
