import { DeleteStudyButton } from "@/app/components/DeleteStudyButton";
import { StudyApprovalForm } from "@/app/components/StudyApprovalForm";
import { isAdmin } from "@/app/lib/auth/auth";
import { getLocalizedValue } from "@/app/lib/pages";
import { localeToBcp47, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import {
  getStudiesPath,
  getStudyPath,
  localizedStudyName,
  pickStudySlug,
  resolveStudySlugParam,
} from "@/app/lib/study-slugs";
import { Study } from "@/app/types/study";
import { db } from "@/db";
import { studies, studyTagRelations, studyTags } from "@/db/schema";
import { localesInfo } from "@/i18n/locales";
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

type PageParams = Promise<{ locale: string; slug: string }>;

/**
 * Resolve the requested study (cached per request so metadata + render share
 * one lookup). Accepts the canonical per-locale headline slug, a legacy
 * numeric id (/studies/42 — what the chat cites), or another locale's slug
 * for the same study; the latter two redirect to the canonical slug URL.
 */
const loadStudy = cache(async (locale: string, slugParam: string) => {
  const resolution = await resolveStudySlugParam(locale, slugParam);
  if (!resolution) return null;

  const rawStudy = (
    await db
      .select()
      .from(studies)
      .where(eq(studies.id, resolution.studyId))
      .limit(1)
  )[0];
  if (!rawStudy) return null;

  return {
    rawStudy,
    slugs: resolution.slugs,
    canonicalSlug: pickStudySlug(resolution.slugs, locale, resolution.studyId),
    isCanonical: resolution.canonical,
  };
});

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await loadStudy(locale, slug);

  if (!data || !data.isCanonical) {
    // Numeric/foreign-slug URLs redirect (no body is served); unknown slugs
    // get the "moved" 404 page. Neither should be indexed.
    return {
      title: "Study | detrans.ai",
      robots: { index: false, follow: false },
    };
  }

  const { rawStudy, slugs, canonicalSlug } = data;
  const title = localizedStudyName(rawStudy, locale) || "Study";
  const description =
    getLocalizedValue(
      rawStudy.descriptionTranslation,
      locale,
      rawStudy.description,
    ) ||
    rawStudy.summary ||
    rawStudy.abstract ||
    undefined;
  const canonical = `${SITE_URL}${getStudyPath(locale, canonicalSlug)}`;

  const languages: Record<string, string> = {};
  for (const info of localesInfo) {
    languages[localeToBcp47[info.code] ?? info.code] =
      `${SITE_URL}${getStudyPath(
        info.code,
        pickStudySlug(slugs, info.code, rawStudy.id),
      )}`;
  }
  languages["x-default"] = `${SITE_URL}${getStudyPath(
    "en",
    pickStudySlug(slugs, "en", rawStudy.id),
  )}`;

  return {
    title: `${title} | detrans.ai`,
    description,
    // Unapproved studies (admin edit view) must never be indexed
    robots: rawStudy.approved ? undefined : { index: false, follow: false },
    openGraph: {
      title: `${title} | detrans.ai`,
      description,
      url: canonical,
      siteName: "detrans.ai",
      images: [`${SITE_URL}/x_card_lg.png`],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | detrans.ai`,
      description,
    },
    alternates: {
      canonical,
      languages,
    },
  };
}

export default async function StudyPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const data = await loadStudy(locale, slug);

  if (!data) {
    notFound();
  }

  // Legacy numeric ids, other locales' slugs and non-normalized encodings
  // all land on the canonical URL
  if (encodeURIComponent(data.canonicalSlug) !== slug) {
    permanentRedirect(getStudyPath(locale, data.canonicalSlug));
  }

  const rawStudy = data.rawStudy;

  // Load tags from normalized tables with translations
  const tagRecords = await db
    .select({ name: studyTags.name, translations: studyTags.translations })
    .from(studyTagRelations)
    .innerJoin(studyTags, eq(studyTagRelations.tagId, studyTags.id))
    .where(eq(studyTagRelations.studyId, rawStudy.id));

  const localizedTags = tagRecords.map((t) => {
    if (!t.translations) return t.name;
    try {
      const trans = JSON.parse(t.translations) as Record<string, string>;
      return trans[locale] || t.name;
    } catch {
      return t.name;
    }
  });

  // Localize keyPoints
  let localizedKeyPoints = rawStudy.keyPoints;
  if (rawStudy.keyPointsTranslation) {
    try {
      const kpTrans = JSON.parse(rawStudy.keyPointsTranslation) as Record<
        string,
        string[]
      >;
      localizedKeyPoints = kpTrans[locale] || rawStudy.keyPoints;
    } catch {
      // keep default
    }
  }

  const study: Study = {
    ...rawStudy,
    headline: getLocalizedValue(
      rawStudy.headlineTranslation,
      locale,
      rawStudy.headline,
    ),
    title: getLocalizedValue(rawStudy.titleTranslation, locale, rawStudy.title),
    description: getLocalizedValue(
      rawStudy.descriptionTranslation,
      locale,
      rawStudy.description,
    ),
    tags: localizedTags,
    keyPoints: localizedKeyPoints,
    slug: data.canonicalSlug,
  };
  const admin = await isAdmin();

  const studyUrl = `${SITE_URL}${getStudyPath(locale, data.canonicalSlug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    name: study.headline || study.title,
    headline: study.headline || study.title,
    description: study.summary || study.abstract || study.description,
    author: study.authors
      ? study.authors.split(",").map((author) => ({
          "@type": "Person",
          name: author.trim(),
        }))
      : undefined,
    datePublished: study.year ? `${study.year}` : undefined,
    publisher: {
      "@type": "Organization",
      name: "detrans.ai",
      url: SITE_URL,
    },
    url: studyUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": studyUrl,
    },
    keywords: study.tags?.join(", "),
    about: {
      "@type": "Thing",
      name: "detransition",
    },
  };

  return (
    <div className="pb-16 lg:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="mb-4">
        <Link
          href={getStudiesPath(locale)}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to studies
        </Link>
      </div>

      {admin ? (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              {study.approved ? "Edit Study" : "Approve Study"}
            </h1>
            <DeleteStudyButton studyId={study.id} locale={locale} />
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <StudyApprovalForm study={study} locale={locale} />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold">
              {study.headline || study.title || "Untitled Study"}
            </h1>
            {study.headline &&
              study.title &&
              study.headline !== study.title && (
                <p className="mt-3 text-lg text-gray-600 italic dark:text-gray-400">
                  {study.title}
                </p>
              )}
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {study.tags &&
              study.tags.length > 0 &&
              study.tags.map((tag) => (
                <span
                  key={tag}
                  className="font- inline-flex items-center rounded-full border bg-gray-100 px-2 py-1 text-sm text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
          </div>

          {/* Metadata */}
          <div className="border-t border-b py-4 dark:border-gray-700 dark:bg-gray-800/50">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {study.authors && (
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">
                    Authors
                  </dt>
                  <dd>{study.authors}</dd>
                </div>
              )}
              {study.year && (
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">
                    Year
                  </dt>
                  <dd>{study.year}</dd>
                </div>
              )}
              {study.journal && (
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">
                    Journal
                  </dt>
                  <dd>{study.journal}</dd>
                </div>
              )}
              {study.url && (
                <div>
                  <dt className="font-medium text-gray-500 dark:text-gray-400">
                    Source
                  </dt>
                  <dd>
                    <a
                      href={study.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {study.displayUrl || study.url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Limitations */}
          {study.limitations && study.limitations.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
              <h2 className="mb-2 text-sm font-semibold text-red-800 dark:text-red-200">
                Methodological Limitations
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-red-700 dark:text-red-300">
                {study.limitations.map((limitation, i) => (
                  <li key={i}>{limitation}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Points */}
          {study.keyPoints && study.keyPoints.length > 0 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">Key Findings</h2>
              <ul className="list-disc space-y-1 pl-5">
                {study.keyPoints.map((point, i) => (
                  <li key={i} className="text-gray-800 dark:text-gray-200">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Abstract */}
          {study.abstract && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">Abstract</h2>
              <p className="leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {study.abstract}
              </p>
            </div>
          )}

          {/* Summary */}
          {study.summary && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">Summary</h2>
              <p className="leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {study.summary}
              </p>
            </div>
          )}

          {/* Conclusion */}
          {study.conclusion && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">Conclusion</h2>
              <p className="leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {study.conclusion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
