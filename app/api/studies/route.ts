import {
  MAX_STUDY_TITLE_LENGTH,
  MAX_STUDY_URL_LENGTH,
  VALID_LOCALES,
} from "@/app/lib/constants";
import { checkIpBan, getIpFromRequest } from "@/app/lib/ipBan";
import {
  incrementMessageCount,
  isCaptchaRequired,
} from "@/app/lib/messageCounter";
import { checkRateLimit } from "@/app/lib/rateLimit";
import {
  sanitizeLocale,
  sanitizeString,
  sanitizeUrl,
} from "@/app/lib/sanitization";
import { db } from "@/db";
import { studies } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
  locale: string,
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
    const locale = sanitizeLocale(
      searchParams.get("locale"),
      VALID_LOCALES,
      "en",
    );

    const allStudies = await db
      .select()
      .from(studies)
      .where(eq(studies.processed, true))
      .orderBy(desc(studies.year));

    const localizedStudies = (allStudies as StudyWithTranslations[]).map(
      (study) => ({
        id: study.id,
        headline: getLocalizedField(
          study.headline,
          study.headlineTranslation,
          locale,
        ),
        title: getLocalizedField(study.title, study.titleTranslation, locale),
        authors: study.authors,
        description: getLocalizedField(
          study.description,
          study.descriptionTranslation,
          locale,
        ),
        year: study.year,
        url: study.url,
        displayUrl: study.displayUrl,
        journal: getLocalizedField(
          study.journal,
          study.journalTranslation,
          locale,
        ),
      }),
    );

    return NextResponse.json({
      studies: localizedStudies,
      count: localizedStudies.length,
    });
  } catch (error) {
    console.error("Error fetching studies:", error);
    return NextResponse.json(
      { error: "Failed to fetch studies" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (10/min, 100/hour)
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Check if IP is banned before processing request
    await checkIpBan(request);

    // Check CAPTCHA requirement
    const ipAddress = getIpFromRequest(request);
    const captchaRequired = await isCaptchaRequired(ipAddress);
    if (captchaRequired) {
      return NextResponse.json(
        {
          requiresCaptcha: true,
          error: "CAPTCHA verification required",
        },
        { status: 402 },
      );
    }

    const body = await request.json();
    const { url: rawUrl, title: rawSuggestedTitle } = body;

    // Sanitize inputs
    const url = sanitizeUrl(rawUrl, MAX_STUDY_URL_LENGTH);
    const suggestedTitle = sanitizeString(
      rawSuggestedTitle,
      MAX_STUDY_TITLE_LENGTH,
    );

    if (!url) {
      return NextResponse.json(
        { error: "Valid URL is required" },
        { status: 400 },
      );
    }

    // Generate displayUrl from the URL
    let displayUrl: string;
    try {
      const urlObj = new URL(url);
      displayUrl = urlObj.hostname + urlObj.pathname;
    } catch {
      displayUrl = url;
    }

    // Insert the study with just URL and processed = false
    // If user provided a suggested title, store it in headline field
    const result = await db
      .insert(studies)
      .values({
        url,
        displayUrl,
        headline: suggestedTitle || null,
        processed: false,
      })
      .returning();

    // Increment message count for CAPTCHA tracking
    await incrementMessageCount(ipAddress);

    return NextResponse.json(
      {
        success: true,
        study: result[0],
        message: "Study submitted successfully and is awaiting review",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error submitting study:", error);
    return NextResponse.json(
      { error: "Failed to submit study" },
      { status: 500 },
    );
  }
}
