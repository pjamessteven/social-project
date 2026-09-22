import { WikiPageLayout } from "@/app/components/content/WikiPageLayout";
import { isAdmin } from "@/app/lib/auth/auth";
import { renderWikiMarkdown } from "@/app/lib/markdown";
import {
  buildLocalizedPath,
  getAllPagesWithSlugs,
  getLocalizedValue,
  getPageAncestors,
  getPageChildren,
  getPageSiblings,
  resolvePageBySegments,
} from "@/app/lib/pages";
import { localeToBcp47, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import { localesInfo } from "@/i18n/locales";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

const DEFAULT_OG_IMAGE = `${SITE_URL}/x_card_lg.png`;

type PageParams = Promise<{ locale: string; slug: string[] }>;

/**
 * Resolve the requested wiki page (cached per request so metadata + render
 * share one lookup). Admins can preview drafts; the public only sees
 * published pages.
 */
const loadWikiPage = cache(async (locale: string, slug: string[]) => {
  const includeDrafts = await isAdmin();
  const item = await resolvePageBySegments(slug, locale, { includeDrafts });
  if (!item) return null;

  const all = await getAllPagesWithSlugs();
  const byId = new Map(all.map((entry) => [entry.page.id, entry]));
  return { item, byId, includeDrafts };
});

function localizedTitle(
  entry: { page: { title: string; titleTranslation: string | null } },
  locale: string,
): string {
  return (
    getLocalizedValue(entry.page.titleTranslation, locale, entry.page.title) ??
    entry.page.title
  );
}

function localizedSummary(
  entry: {
    page: { summary: string | null; summaryTranslation: string | null };
  },
  locale: string,
): string | null {
  return getLocalizedValue(
    entry.page.summaryTranslation,
    locale,
    entry.page.summary,
  );
}

function publicUrl(
  entry: Parameters<typeof buildLocalizedPath>[0],
  byId: Map<number, Parameters<typeof buildLocalizedPath>[0]>,
  locale: string,
): string {
  return `${SITE_URL}/${locale}/topics/${buildLocalizedPath(entry, byId, locale)}`;
}

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await loadWikiPage(locale, slug ?? []);

  if (!data) {
    return {
      title: "Page not found | detrans.ai",
      robots: { index: false, follow: false },
    };
  }

  const { item, byId } = data;
  const title = localizedTitle(item, locale);
  const summary = localizedSummary(item, locale);

  const languages: Record<string, string> = {};
  for (const info of localesInfo) {
    languages[localeToBcp47[info.code] ?? info.code] = publicUrl(
      item,
      byId,
      info.code,
    );
  }
  languages["x-default"] = publicUrl(item, byId, "en");

  const canonical = publicUrl(item, byId, locale);

  return {
    title: `${title} | detrans.ai`,
    description: summary ?? undefined,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description: summary ?? undefined,
      url: canonical,
      siteName: "detrans.ai",
      images: [DEFAULT_OG_IMAGE],
      type: "article",
      publishedTime: item.page.createdAt.toISOString(),
      modifiedTime: item.page.updatedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary ?? undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function WikiTopicPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale, slug } = await params;
  const data = await loadWikiPage(locale, slug ?? []);
  if (!data) notFound();

  const { item, byId, includeDrafts } = data;
  const { page } = item;

  const title = localizedTitle(item, locale);
  const summary = localizedSummary(item, locale);
  const content =
    getLocalizedValue(page.contentTranslation, locale, page.content) ??
    page.content;

  const { html, toc } = renderWikiMarkdown(content);

  // Navigation: ancestors (breadcrumbs), children (hub index), siblings
  const ancestors = getPageAncestors(item, byId);
  const published = Array.from(byId.values()).filter(
    (entry) => entry.page.published,
  );
  const children = getPageChildren(item, published);
  const siblings = getPageSiblings(item, published);

  const canonical = publicUrl(item, byId, locale);
  const isDraftPreview = includeDrafts && !page.published;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: summary ?? undefined,
    datePublished: page.createdAt.toISOString(),
    dateModified: page.updatedAt.toISOString(),
    mainEntityOfPage: canonical,
    inLanguage: localeToBcp47[locale] ?? locale,
    author: {
      "@type": "Organization",
      name: "detrans.ai",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "detrans.ai",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_OG_IMAGE,
      },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [...ancestors, item].map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: localizedTitle(entry, locale),
      item: publicUrl(entry, byId, locale),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd([articleJsonLd, breadcrumbJsonLd]),
        }}
      />
      <WikiPageLayout toc={toc}>
        {isDraftPreview && (
          <div className="not-prose mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            Draft preview — this page is not published and is only visible to
            admins.
          </div>
        )}

        <nav aria-label="Breadcrumb" className="not-prose mb-4 text-sm">
          <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5">
            {ancestors.map((ancestor) => (
              <li key={ancestor.page.id} className="flex items-center gap-1.5">
                <a
                  href={`/${locale}/topics/${buildLocalizedPath(ancestor, byId, locale)}`}
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {localizedTitle(ancestor, locale)}
                </a>
                <span aria-hidden="true">/</span>
              </li>
            ))}
            <li aria-current="page">{title}</li>
          </ol>
        </nav>

        <article>
          <h1 className="text-3xl font-bold">{title}</h1>
          {summary && (
            <p className="text-muted-foreground not-prose mt-2 mb-6 text-base">
              {summary}
            </p>
          )}

          <div dangerouslySetInnerHTML={{ __html: html }} />

          <p className="not-prose text-muted-foreground mt-10 text-sm">
            Last updated:{" "}
            <time dateTime={page.updatedAt.toISOString()}>
              {page.updatedAt.toISOString().slice(0, 10)}
            </time>
            {page.isStub && " · This page is a stub and will be expanded."}
          </p>

          {children.length > 0 && (
            <section className="not-prose mt-10">
              <h2 className="mb-3 text-xl font-semibold">
                Pages in this section
              </h2>
              <ul className="space-y-2">
                {children.map((child) => (
                  <li key={child.page.id}>
                    <a
                      href={`/${locale}/topics/${buildLocalizedPath(child, byId, locale)}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {localizedTitle(child, locale)}
                    </a>
                    {localizedSummary(child, locale) && (
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {localizedSummary(child, locale)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {siblings.length > 0 && (
            <nav aria-label="Related pages" className="not-prose mt-10">
              <h2 className="mb-3 text-xl font-semibold">Related pages</h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {siblings.slice(0, 12).map((sibling) => (
                  <li key={sibling.page.id}>
                    <a
                      href={`/${locale}/topics/${buildLocalizedPath(sibling, byId, locale)}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {localizedTitle(sibling, locale)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </article>
      </WikiPageLayout>
    </>
  );
}
