/**
 * Server implementation shared by /studies/topic/[category] and
 * /studies/method/[category] (the route files are thin wrappers).
 */

import { PAGE_TITLE } from "@/app/components/ui/typography";
import { isAdmin } from "@/app/lib/auth/auth";
import { isBot } from "@/app/lib/isBot";
import { localeToBcp47, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import {
  getLocalizedCategories,
  getStudyCategoryPath,
  pickCategorySlug,
  resolveCategoryParam,
  type StudyCategoryKind,
} from "@/app/lib/study-categories";
import { loadLocalizedStudies } from "@/app/lib/study-list";
import { getStudiesPath, getStudyPath } from "@/app/lib/study-slugs";
import { localesInfo } from "@/i18n/locales";
import { ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { StudyCategoryAdmin } from "./StudyCategoryAdmin";
import { StudyCategoryView } from "./StudyCategoryView";
import { StudyList } from "./StudyList";

export type CategoryPageParams = Promise<{ locale: string; category: string }>;

const loadCategory = cache(
  async (kind: StudyCategoryKind, locale: string, param: string) => {
    const resolution = await resolveCategoryParam(kind, locale, param);
    if (!resolution) return null;
    const categories = await getLocalizedCategories(locale);
    const category = categories.find((c) => c.id === resolution.row.id);
    if (!category) return null;
    return { ...resolution, category, categories };
  },
);

export async function generateCategoryMetadata(
  kind: StudyCategoryKind,
  params: CategoryPageParams,
): Promise<Metadata> {
  const { locale, category: param } = await params;
  const data = await loadCategory(kind, locale, param);
  if (!data || !data.canonical) {
    return { robots: { index: false, follow: false } };
  }

  const t = await getTranslations({ locale, namespace: "studiesPage" });
  const { category, row } = data;
  const title = t("categoryMetaTitle", { name: category.name });
  const canonical = `${SITE_URL}${getStudyCategoryPath(locale, kind, category.slug)}`;

  const languages: Record<string, string> = {};
  for (const info of localesInfo) {
    languages[localeToBcp47[info.code] ?? info.code] =
      `${SITE_URL}${getStudyCategoryPath(info.code, kind, pickCategorySlug(row, info.code))}`;
  }
  languages["x-default"] =
    `${SITE_URL}${getStudyCategoryPath("en", kind, row.slug)}`;

  return {
    title,
    description: category.description,
    // Empty categories are only visible to admins; keep them out of search
    robots:
      category.studyCount > 0 ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description: category.description,
      url: canonical,
      siteName: "detrans.ai",
      images: [`${SITE_URL}/x_card_lg.png`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: category.description,
    },
    alternates: { canonical, languages },
  };
}

export async function StudyCategoryPage({
  kind,
  params,
}: {
  kind: StudyCategoryKind;
  params: CategoryPageParams;
}) {
  const { locale, category: param } = await params;
  const data = await loadCategory(kind, locale, param);
  if (!data) notFound();

  // Other locales' slugs and non-normalized encodings land on the canonical URL
  if (encodeURIComponent(data.canonicalSlug) !== param) {
    permanentRedirect(getStudyCategoryPath(locale, kind, data.canonicalSlug));
  }

  const t = await getTranslations({ locale, namespace: "studiesPage" });
  const admin = await isAdmin();
  const bot = isBot((await headers()).get("user-agent"));
  const { category, categories, row } = data;

  const studies = await loadLocalizedStudies({
    locale,
    categories,
    categoryId: category.id,
    includeUnapproved: admin,
  });
  const siblings = categories.filter(
    (c) => c.kind === kind && c.id !== category.id && c.studyCount > 0,
  );
  const hubHref =
    kind === "method"
      ? `${getStudiesPath(locale)}?by=method`
      : getStudiesPath(locale);
  const pageUrl = `${SITE_URL}${getStudyCategoryPath(locale, kind, category.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description,
    url: pageUrl,
    isPartOf: {
      "@type": "CollectionPage",
      name: t("title"),
      url: `${SITE_URL}${getStudiesPath(locale)}`,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: studies.length,
      itemListElement: studies.map((study, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "ScholarlyArticle",
          name: study.headline || study.title,
          url: `${SITE_URL}${getStudyPath(locale, study.slug || String(study.id))}`,
          datePublished: study.year ? `${study.year}` : undefined,
        },
      })),
    },
  };

  return (
    <div className="pb-16 lg:-mx-16 lg:pt-8 xl:-mx-48">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <Link
        href={hubHref}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("allStudies")}
      </Link>

      <header className="mt-6 mb-8 max-w-3xl">
        <h1 className={PAGE_TITLE}>{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            {category.description}
          </p>
        )}
      </header>

      {admin && (
        <div className="mb-8">
          <StudyCategoryAdmin
            kind={kind}
            category={{
              id: row.id,
              kind: row.kind,
              slug: row.slug,
              name: row.name,
              description: row.description,
              sortOrder: row.sortOrder,
            }}
            onDeletedHref={hubHref}
          />
        </div>
      )}

      {bot ? (
        <StudyList
          studies={studies}
          locale={locale}
          currentCategoryId={category.id}
        />
      ) : (
        <StudyCategoryView
          categoryId={category.id}
          studies={studies}
          filterKind={kind === "topic" ? "method" : "topic"}
          locale={locale}
          isAdmin={admin}
        />
      )}

      {siblings.length > 0 && (
        <nav className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">
            {kind === "topic" ? t("otherTopics") : t("otherMethods")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <li key={sibling.id}>
                <Link
                  href={getStudyCategoryPath(locale, kind, sibling.slug)}
                  className="dark:bg-secondary hover:border-foreground/30 inline-block rounded-full border bg-white px-3 py-1.5 text-sm"
                >
                  {sibling.name}{" "}
                  <span className="text-muted-foreground">
                    {sibling.studyCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
