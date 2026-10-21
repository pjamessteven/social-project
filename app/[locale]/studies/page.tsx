"use server";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import { isAdmin } from "@/app/lib/auth/auth";
import { isBot } from "@/app/lib/isBot";
import { localeToBcp47, ogLocale, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import {
  getLocalizedCategories,
  getStudyCategoryPath,
  STUDY_CATEGORY_KINDS,
} from "@/app/lib/study-categories";
import { loadLocalizedStudies } from "@/app/lib/study-list";
import { getStudiesPath, getStudyPath } from "@/app/lib/study-slugs";
import { localesInfo } from "@/i18n/locales";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { IntroWithSeeAlso } from "../../components/content/IntroWithSeeAlso";
import ParticipateCard from "../../components/content/ParticipateCard";
import DebunkCard from "../../components/studies/DebunkCard";
import { StudiesHub } from "../../components/studies/StudiesHub";
import { StudyCategoryGrid } from "../../components/studies/StudyGrid";
import { StudyList } from "../../components/studies/StudyList";
import StudySubmitForm from "../../components/StudySubmitForm";

/** External research resources linked beside the intro. */
const STUDIES_SEE_ALSO = [
  { key: "segm", href: "https://segm.org/studies" },
  { key: "statsForGender", href: "https://statsforgender.org/" },
  { key: "canSg", href: "https://can-sg.org/academic-papers/" },
  { key: "genderClinicNews", href: "https://www.genderclinicnews.com/" },
] as const;

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
      url: `${SITE_URL}${getStudiesPath(locale)}`,
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: ogLocale(locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadata.ogTitle"),
      description: t("metadata.ogDescription"),
    },
    alternates: {
      canonical: `${SITE_URL}${getStudiesPath(locale)}`,
      languages: {
        ...Object.fromEntries(
          localesInfo.map((l) => [
            localeToBcp47[l.code] ?? l.code,
            `${SITE_URL}${getStudiesPath(l.code)}`,
          ]),
        ),
        "x-default": `${SITE_URL}${getStudiesPath("en")}`,
      },
    },
  };
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

  const categories = await getLocalizedCategories(locale);
  const allStudies = await loadLocalizedStudies({
    locale,
    categories,
    includeUnapproved: admin,
  });
  const approvedStudies = allStudies.filter((s) => s.approved);
  const pendingStudies = allStudies.filter((s) => !s.approved);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("metadata.title"),
    description: t("metadata.description"),
    url: `${SITE_URL}${getStudiesPath(locale)}`,
    publisher: {
      "@type": "Organization",
      name: "detrans.ai",
      url: "https://detrans.ai",
    },
    hasPart: categories
      .filter((c) => c.studyCount > 0)
      .map((c) => ({
        "@type": "CollectionPage",
        name: c.name,
        description: c.description,
        url: `${SITE_URL}${getStudyCategoryPath(locale, c.kind, c.slug)}`,
      })),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: approvedStudies.length,
      itemListElement: approvedStudies.slice(0, 20).map((study, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "ScholarlyArticle",
          name: study.headline || study.title,
          url: `${SITE_URL}${getStudyPath(locale, study.slug || String(study.id))}`,
          author: study.authors
            ? { "@type": "Person", name: study.authors }
            : undefined,
          datePublished: study.year ? `${study.year}` : undefined,
        },
      })),
    },
  };

  const header = (
    <>
      <h1 className={PAGE_TITLE}>{t("title")}</h1>
      <IntroWithSeeAlso
        className="mt-4 mb-6"
        title={t("seeAlso.title")}
        links={STUDIES_SEE_ALSO.map(({ key, href }) => ({
          label: t(`seeAlso.links.${key}`),
          href,
          external: true,
        }))}
      >
        <div className="text-muted-foreground space-y-3 text-base leading-relaxed">
          <p>{t("description")}</p>
          <p>{t("analysis")}</p>
        </div>
      </IntroWithSeeAlso>
    </>
  );

  // Bots: pure SSR (no client components) — both category grids, so every
  // topic and method page is linked from the index.
  if (bot) {
    return (
      <div className="prose dark:prose-invert pb-16 lg:-mx-16 lg:max-w-none lg:pt-8 xl:-mx-48">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        {header}
        {STUDY_CATEGORY_KINDS.map((kind) => (
          <section key={kind} className="not-prose mt-10">
            <h2 className="mb-4 text-xl font-semibold">
              {kind === "topic" ? t("byTopic") : t("byMethod")}
            </h2>
            <StudyCategoryGrid
              categories={categories.filter(
                (c) => c.kind === kind && c.studyCount > 0,
              )}
              locale={locale}
            />
          </section>
        ))}
        <section className="not-prose relative isolate mt-12 pt-12 md:mt-16 md:pt-11">
          <div
            aria-hidden
            className="from-secondary/50 absolute top-0 -left-[5000px] -z-10 h-[32rem] w-[10000px] border-t bg-linear-to-b to-transparent"
          />
          <h2 className="mb-4 text-xl font-semibold">{t("allStudies")}</h2>
          <StudyList studies={approvedStudies} locale={locale} />
        </section>
      </div>
    );
  }

  return (
    <div className="prose dark:prose-invert pb-16 lg:-mx-16 lg:max-w-none lg:pt-8 xl:-mx-48">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      {header}

      <StudySubmitForm />

      <div className="not-prose mt-8">
        <StudiesHub
          categories={categories}
          studies={approvedStudies}
          pendingStudies={pendingStudies}
          isAdmin={admin}
          locale={locale}
          banner={
            <>
              <ParticipateCard />
              <DebunkCard />
            </>
          }
        />
      </div>
    </div>
  );
}
