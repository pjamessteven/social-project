import {
  MAX_STUDY_TITLE_LENGTH,
  MAX_STUDY_URL_LENGTH,
  VALID_LOCALES,
} from "@/app/lib/constants";
import { withApiSecurity } from "@/app/lib/apiSecurity";
import {
  incrementMessageCount,
} from "@/app/lib/messageCounter";
import {
  sanitizeLocale,
  sanitizeString,
  sanitizeUrl,
} from "@/app/lib/sanitization";
import { db } from "@/db";
import { studies, studyTags, studyTagRelations } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/lib/auth/auth";
import { getMailer } from "@/app/lib/mailer";
import { z } from "zod";

const submitStudySchema = z.object({
  url: z.string().url().max(MAX_STUDY_URL_LENGTH),
  title: z.string().max(MAX_STUDY_TITLE_LENGTH).optional(),
});

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
  keyPoints: string[] | null;
  keyPointsTranslation: string | null;
  approved: boolean;
  fullText: string | null;
  abstract: string | null;
  conclusion: string | null;
  summary: string | null;
  limitations: string[] | null;
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

function getLocalizedArray(
  defaultValue: string[] | null,
  translationsJson: string | null,
  locale: string,
): string[] | null {
  if (!translationsJson) return defaultValue;

  try {
    const translations = JSON.parse(translationsJson) as Record<string, string[]>;
    return translations[locale] || defaultValue;
  } catch {
    return defaultValue;
  }
}

function getLocalizedTagName(
  defaultName: string,
  translationsJson: string | null,
  locale: string,
): string {
  if (!translationsJson) return defaultName;

  try {
    const translations = JSON.parse(translationsJson) as Record<string, string>;
    return translations[locale] || defaultName;
  } catch {
    return defaultName;
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
    const tagFilter = searchParams.get("tag");

    const admin = await isAdmin();

    let allStudies;
    if (admin) {
      // Admin sees all studies
      allStudies = await db
        .select()
        .from(studies)
        .orderBy(desc(studies.year));
    } else {
      // Public sees only approved studies
      allStudies = await db
        .select()
        .from(studies)
        .where(eq(studies.approved, true))
        .orderBy(desc(studies.year));
    }

    let filteredStudies = allStudies as StudyWithTranslations[];

    // Load all study-tag relations with translations
    const studyIds = filteredStudies.map((s) => s.id);
    const allTagsQuery =
      studyIds.length > 0
        ? await db
            .select({
              studyId: studyTagRelations.studyId,
              tagName: studyTags.name,
              tagTranslations: studyTags.translations,
            })
            .from(studyTagRelations)
            .innerJoin(studyTags, eq(studyTagRelations.tagId, studyTags.id))
            .where(inArray(studyTagRelations.studyId, studyIds))
        : [];

    // Map studyId -> localized tag names
    const localizedTagsByStudyId = new Map<number, string[]>();
    // Map default tag name -> { localizedName, count }
    const tagCounts = new Map<string, { name: string; count: number }>();

    for (const row of allTagsQuery) {
      const localizedName = getLocalizedTagName(
        row.tagName,
        row.tagTranslations,
        locale,
      );

      const existing = localizedTagsByStudyId.get(row.studyId) || [];
      existing.push(localizedName);
      localizedTagsByStudyId.set(row.studyId, existing);

      const current = tagCounts.get(row.tagName);
      if (current) {
        current.count += 1;
      } else {
        tagCounts.set(row.tagName, { name: localizedName, count: 1 });
      }
    }

    // Apply tag filter if present (filter by localized name)
    if (tagFilter) {
      filteredStudies = filteredStudies.filter((s) => {
        const tags = localizedTagsByStudyId.get(s.id) || [];
        return tags.includes(tagFilter);
      });
    }

    const localizedStudies = filteredStudies.map((study) => ({
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
      approved: study.approved,
      fullText: study.fullText,
      abstract: study.abstract,
      conclusion: study.conclusion,
      keyPoints: getLocalizedArray(
        study.keyPoints,
        study.keyPointsTranslation,
        locale,
      ),
      summary: study.summary,
      tags: localizedTagsByStudyId.get(study.id) || [],
      limitations: study.limitations,
    }));

    return NextResponse.json({
      studies: localizedStudies,
      count: localizedStudies.length,
      isAdmin: admin,
      tags: Array.from(tagCounts.values())
        .sort((a, b) => b.count - a.count)
        .map((t) => [t.name, t.count] as [string, number]),
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
    // Centralized security: rate limit + IP ban + captcha + validation
    const { ip: ipAddress, validatedBody, error: securityError } = await withApiSecurity(request, {
      rateLimit: true,
      ipBan: true,
      captcha: true,
      validation: { schema: submitStudySchema },
    });
    if (securityError) return securityError;

    const { url: rawUrl, title: rawSuggestedTitle } = validatedBody as z.infer<typeof submitStudySchema>;

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

    // Insert the study with just URL and approved = false
    // If user provided a suggested title, store it in headline field
    const result = await db
      .insert(studies)
      .values({
        url,
        displayUrl,
        headline: suggestedTitle || null,
        approved: false,
        processed: false,
      })
      .returning();

    // Notify admin of new submission (non-blocking)
    try {
      const mailer = getMailer();
      await mailer.sendMail({
        to: process.env.ZOHO_EMAIL!,
        subject: `New Study Submission: ${suggestedTitle || url}`,
        content: `<p>A new study has been submitted:</p>
<ul>
<li><b>URL:</b> ${url}</li>
<li><b>Suggested Title:</b> ${suggestedTitle || "N/A"}</li>
<li><b>Time:</b> ${new Date().toISOString()}</li>
</ul>`,
      });
    } catch (emailError) {
      console.error("Failed to send study submission email:", emailError);
    }

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
