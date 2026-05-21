"use server";
import { isAdmin } from "@/app/lib/auth/auth";
import { isBot } from "@/app/lib/isBot";
import { Study } from "@/app/types/study";
import { db } from "@/db";
import { studies, studyTagRelations, studyTags } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";
import { StudiesList } from "../../components/StudiesList";
import StudySubmitForm from "../../components/StudySubmitForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studiesPage" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    openGraph: {
      title: t("metadata.ogTitle"),
      description: t("metadata.ogDescription"),
      url: "https://detrans.ai/studies",
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: locale === "en" ? "en_US" : locale === "fr" ? "fr_FR" : "es_ES",
      type: "website",
    },
  };
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
    const translations = JSON.parse(translationsJson) as Record<
      string,
      string[]
    >;
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

export default async function StudiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studiesPage" });
  const admin = await isAdmin();
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  // Query studies directly (admins see all, public sees only approved)
  const allStudies = admin
    ? await db.select().from(studies).orderBy(desc(studies.year))
    : await db
        .select()
        .from(studies)
        .where(eq(studies.approved, true))
        .orderBy(desc(studies.year));

  // Load tags with translations
  const studyIds = allStudies.map((s) => s.id);
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

  const localizedTagsByStudyId = new Map<number, string[]>();
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

  // Build study data with translations
  const studiesData: Study[] = allStudies.map((study) => ({
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
    journal: study.journal,
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

  const tags: [string, number][] = Array.from(tagCounts.values())
    .sort((a, b) => b.count - a.count)
    .map((t) => [t.name, t.count]);

  // For bots: render pure SSR card grid (no client components)
  if (bot) {
    // Bots only see approved studies
    const approvedStudies = studiesData.filter((s) => s.approved);

    return (
      <div className="prose dark:prose-invert pb-16 lg:pt-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        <p className="text-muted-foreground">
          {t.rich("segmNote", {
            a: (chunks) => (
              <a
                href="https://segm.org/studies"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-800 dark:hover:text-blue-300"
              >
                {chunks}
              </a>
            ),
          })}
        </p>

        <div className="not-prose mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {approvedStudies.map((study) => {
            const detailHref = `/${locale}/studies/${study.id}`;
            return (
              <article
                key={study.id}
                className="block rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <h2 className="mb-2 text-base font-semibold">
                  <Link
                    href={detailHref}
                    className="text-blue-600 no-underline hover:underline dark:text-blue-400"
                  >
                    {study.headline}
                  </Link>
                </h2>

                <div className="mb-1 flex items-start justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="line-clamp-1 flex-1 italic">
                    {study.title}
                  </span>
                  <span className="shrink-0">({study.year})</span>
                </div>

                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  <span>{study.authors}</span>
                  {study.journal && (
                    <>
                      {" "}
                      (<em>{study.journal}</em>)
                    </>
                  )}
                </p>

                {study.tags && study.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t py-3">
                    {study.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {study.description && (
                  <div className="border-t py-3 text-sm text-gray-600 dark:text-gray-400">
                    <p>{study.description}</p>
                    <a
                      href={study.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 no-underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <span>{study.displayUrl || study.url}</span>
                    </a>
                  </div>
                )}

                {study.keyPoints && study.keyPoints.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Key Findings
                    </h3>
                    <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                      {study.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // For humans: render interactive client component
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <p className="text-muted-foreground">
        {t.rich("segmNote", {
          a: (chunks) => (
            <a
              href="https://segm.org/studies"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-800 dark:hover:text-blue-300"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
      <StudySubmitForm />

      <div className="mt-8">
        <StudiesList
          studies={studiesData}
          isAdmin={admin}
          locale={locale}
          tags={tags}
        />
      </div>

      <hr />
    </div>
  );
}
