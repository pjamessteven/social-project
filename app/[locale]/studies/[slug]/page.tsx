import { DocsLayout } from "@/app/components/content/DocsLayout";
import { DeleteStudyButton } from "@/app/components/DeleteStudyButton";
import { StudyApprovalForm } from "@/app/components/StudyApprovalForm";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import { isAdmin } from "@/app/lib/auth/auth";
import { getLocalizedValue } from "@/app/lib/pages";
import { localeToBcp47, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import {
  getAllCategoryRows,
  getStudyCategoryIdMap,
  getStudyCategoryPath,
  localizeCategory,
  toCategoryRef,
} from "@/app/lib/study-categories";
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
import { ArrowLeft } from "lucide-react";
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

export default async function StudyPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: Promise<{ edit?: string }>;
}) {
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

  // Curated categories: localized for display, English for the admin form
  const [categoryRows, categoryIdMap] = await Promise.all([
    getAllCategoryRows(),
    getStudyCategoryIdMap([rawStudy.id]),
  ]);
  const assignedIds = new Set(categoryIdMap.get(rawStudy.id) ?? []);
  const admin = await isAdmin();
  // Admins read the public view like everyone else and opt into the form via
  // ?edit=1; unapproved studies have no public view, so they open straight
  // into it.
  const editing =
    admin && (!rawStudy.approved || (await searchParams).edit === "1");
  const displayLocale = editing ? "en" : locale;
  const categories = categoryRows
    .filter((row) => assignedIds.has(row.id))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "method" ? -1 : 1))
    .map((row) => toCategoryRef(localizeCategory(row, displayLocale)));

  const study: Study = {
    ...rawStudy,
    categories,
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

  const jsonLdScript = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
    />
  );

  const backLink = (
    <Link
      href={getStudiesPath(locale)}
      className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-base underline-offset-4 hover:underline"
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      Back to studies
    </Link>
  );

  if (editing) {
    return (
      <div className="pb-16 lg:pt-8">
        {jsonLdScript}
        {backLink}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {study.approved ? "Edit Study" : "Approve Study"}
          </h1>
          <DeleteStudyButton studyId={study.id} locale={locale} />
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <StudyApprovalForm
            study={study}
            locale={locale}
            categoryOptions={categoryRows.map((row) =>
              toCategoryRef(localizeCategory(row, "en")),
            )}
          />
        </div>
      </div>
    );
  }

  // Long-form fields are plain text; blank lines separate paragraphs.
  const paragraphs = (text: string) =>
    text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, i) => <p key={i}>{p}</p>);

  const sections = [
    study.keyPoints?.length
      ? {
          id: "key-findings",
          title: "Key findings",
          body: (
            <ul>
              {study.keyPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          ),
        }
      : null,
    study.abstract
      ? { id: "abstract", title: "Abstract", body: paragraphs(study.abstract) }
      : null,
    study.summary
      ? { id: "summary", title: "Summary", body: paragraphs(study.summary) }
      : null,
    study.conclusion
      ? {
          id: "conclusion",
          title: "Conclusion",
          body: paragraphs(study.conclusion),
        }
      : null,
  ].filter((section) => section !== null);

  const hasLimitations = !!study.limitations?.length;
  const toc = [
    ...(hasLimitations
      ? [{ id: "limitations", text: "Limitations", level: 2 }]
      : []),
    ...sections.map((s) => ({ id: s.id, text: s.title, level: 2 })),
  ];

  const metadata = [
    study.authors && { label: "Authors", value: study.authors, wide: true },
    study.journal && { label: "Journal", value: study.journal },
    study.year && { label: "Year", value: String(study.year) },
    study.url && {
      label: "Source",
      wide: true,
      value: (
        <a
          href={study.url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
        >
          {study.displayUrl || study.url}
        </a>
      ),
    },
  ].filter((item) => !!item);

  return (
    <>
      {jsonLdScript}
      <DocsLayout
        toc={toc}
        preface={backLink}
        header={
          <header className="not-prose mb-8">
            {admin && (
              <Link
                href={`${getStudyPath(locale, data.canonicalSlug)}?edit=1`}
                className="hover:bg-secondary float-right ml-4 rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                Edit
              </Link>
            )}
            <h1 className={PAGE_TITLE}>
              {study.headline || study.title || "Untitled Study"}
            </h1>
            {study.headline &&
              study.title &&
              study.headline !== study.title && (
                <p className="text-muted-foreground mt-3 text-lg italic">
                  {study.title}
                </p>
              )}

            {categories.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={getStudyCategoryPath(
                      locale,
                      category.kind,
                      category.slug,
                    )}
                    className="bg-secondary/50 hover:bg-secondary inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}

            {metadata.length > 0 && (
              <dl className="bg-muted/50 mt-6 grid grid-cols-1 gap-x-8 gap-y-4 rounded-lg border p-5 text-sm sm:grid-cols-2">
                {metadata.map((item) => (
                  <div
                    key={item.label}
                    className={item.wide ? "sm:col-span-2" : undefined}
                  >
                    <dt className="text-muted-foreground mb-0.5 text-xs font-medium tracking-wide uppercase">
                      {item.label}
                    </dt>
                    <dd className="leading-relaxed">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </header>
        }
      >
        <article>
          {hasLimitations && (
            <aside
              id="limitations"
              className="not-prose mb-10 scroll-mt-24 rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20"
            >
              <h2 className="mb-3 text-base font-semibold text-red-800 dark:text-red-200">
                Methodological limitations
              </h2>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-red-900 marker:text-red-400 dark:text-red-200/90">
                {study.limitations!.map((limitation, i) => {
                  // Most limitations lead with a short "Label: detail".
                  const match = limitation.match(/^([^:]{1,60}):\s+(.+)$/s);
                  return (
                    <li key={i}>
                      {match ? (
                        <>
                          <span className="font-semibold">{match[1]}:</span>{" "}
                          {match[2]}
                        </>
                      ) : (
                        limitation
                      )}
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}

          {sections.map((section, index) => (
            <section key={section.id}>
              <h2
                id={section.id}
                className={`scroll-mt-24 ${index === 0 ? "mt-0" : ""}`}
              >
                {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </article>
      </DocsLayout>
    </>
  );
}
