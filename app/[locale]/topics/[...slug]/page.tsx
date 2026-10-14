import { DocsLayout } from "@/app/components/content/DocsLayout";
import { WikiAdminActions } from "@/app/components/content/WikiAdminActions";
import { WikiTocLink } from "@/app/components/content/WikiTocLink";
import { WikiViewTracker } from "@/app/components/content/WikiViewTracker";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import { isAdmin } from "@/app/lib/auth/auth";
import { renderWikiMarkdown } from "@/app/lib/markdown";
import {
  buildLocalizedPath,
  findPageByFinalSegment,
  getAllPagesWithSlugs,
  getContentLocales,
  getLocalizedValue,
  getPageAncestors,
  getPageChildren,
  getPageSiblings,
  resolvePageBySegments,
} from "@/app/lib/pages";
import { localeToBcp47, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import { buildWikiHrefRewriter } from "@/app/lib/wiki-links";
import { localesInfo } from "@/i18n/locales";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

const LOGO_URL = `${SITE_URL}/web-app-manifest-512x512.png`;
const SITE_NAME = "detrans.ai";
/** Longest <title> before the " | detrans.ai" suffix is dropped. */
const MAX_TITLE_LENGTH = 60;

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

/**
 * Locale whose URL is canonical for this page in `locale`: the locale itself
 * when the body is translated, otherwise English (untranslated locales serve
 * the English body, so indexing them would be 32 duplicates).
 */
function canonicalLocaleFor(
  entry: { page: Parameters<typeof getContentLocales>[0] },
  locale: string,
): string {
  return getContentLocales(entry.page).includes(locale) ? locale : "en";
}

/**
 * Breadcrumb label: the part of a "Name: description" title before the
 * colon (also " : " in French and the full-width "：" in CJK titles).
 */
function shortTitle(title: string): string {
  const name = title
    .split(/\s*[:：]\s/)[0]
    .split("：")[0]
    .trim();
  return name || title;
}

function documentTitle(title: string): string {
  const full = `${title} | ${SITE_NAME}`;
  return full.length <= MAX_TITLE_LENGTH ? full : title;
}

function ogImageUrl(path: string, locale: string): string {
  const params = new URLSearchParams({ path, locale });
  return `${SITE_URL}/api/og/topic?${params.toString()}`;
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

  // hreflang only lists locales with a translated body.
  const contentLocales = getContentLocales(item.page);
  const languages: Record<string, string> = {};
  for (const info of localesInfo) {
    if (!contentLocales.includes(info.code)) continue;
    languages[localeToBcp47[info.code] ?? info.code] = publicUrl(
      item,
      byId,
      info.code,
    );
  }
  languages["x-default"] = publicUrl(item, byId, "en");

  const canonical = publicUrl(item, byId, canonicalLocaleFor(item, locale));
  const image = ogImageUrl(item.page.path, locale);

  return {
    title: documentTitle(title),
    description: summary ?? undefined,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description: summary ?? undefined,
      url: canonical,
      siteName: SITE_NAME,
      // The layout's default og:locale only knows en/es/fr.
      locale: (localeToBcp47[locale] ?? locale).replace("-", "_"),
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: "article",
      publishedTime: item.page.createdAt.toISOString(),
      modifiedTime: item.page.updatedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary ?? undefined,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

function PageLinkList({
  heading,
  items,
  compact = false,
}: {
  heading: string;
  items: { key: string; href: string; title: string; summary: string | null }[];
  compact?: boolean;
}) {
  // Sidebar variant: match the sidebar TOC links exactly (no underline,
  // same padding/typography, no summaries) by reusing WikiTocLink.
  if (compact) {
    return (
      <section>
        <h2 className="mt-2 mb-2 ml-2 text-sm font-semibold">{heading}:</h2>
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.key}>
              <WikiTocLink href={item.href}>{item.title}</WikiTocLink>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{heading}:</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <a
              href={item.href}
              className="font-medium no-underline decoration-1 underline-offset-4 hover:underline"
            >
              {item.title}
            </a>
            {item.summary && (
              <p className="text-muted-foreground mt-0.5 text-sm">
                {item.summary}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function WikiTopicPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale, slug } = await params;
  const data = await loadWikiPage(locale, slug ?? []);
  if (!data) {
    // Moved pages and links missing their parent segments: 308 to the
    // canonical URL when the final segment identifies exactly one page.
    const moved = await findPageByFinalSegment(slug ?? [], locale, {
      includeDrafts: await isAdmin(),
    });
    if (moved) {
      const all = await getAllPagesWithSlugs();
      const byId = new Map(all.map((entry) => [entry.page.id, entry]));
      permanentRedirect(
        `/${locale}/topics/${buildLocalizedPath(moved, byId, locale)}`,
      );
    }
    notFound();
  }

  const { item, byId, includeDrafts } = data;
  const { page } = item;
  const t = await getTranslations({ locale, namespace: "topicsPage" });
  const tNav = await getTranslations({
    locale,
    namespace: "header.navigation",
  });

  // One URL per page and locale: the default-language path under a locale
  // with its own translated slugs 308s to the localized path.
  const localizedPath = buildLocalizedPath(item, byId, locale);
  const requestedPath = (slug ?? [])
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
  if (requestedPath !== localizedPath) {
    permanentRedirect(`/${locale}/topics/${localizedPath}`);
  }

  const title = localizedTitle(item, locale);
  const summary = localizedSummary(item, locale);
  const contentLocale = canonicalLocaleFor(item, locale);
  const content =
    getLocalizedValue(page.contentTranslation, locale, page.content) ??
    page.content;

  const rewriteHref = await buildWikiHrefRewriter(content, locale, byId);
  const { html, toc } = renderWikiMarkdown(content, { rewriteHref });

  // Navigation: ancestors (breadcrumbs), children (hub index), siblings
  const ancestors = getPageAncestors(item, byId);
  const published = Array.from(byId.values()).filter(
    (entry) => entry.page.published,
  );
  const children = getPageChildren(item, published);
  const siblings = getPageSiblings(item, published);

  const childrenItems = children.map((child) => ({
    key: String(child.page.id),
    href: `/${locale}/topics/${buildLocalizedPath(child, byId, locale)}`,
    title: localizedTitle(child, locale),
    summary: localizedSummary(child, locale),
  }));
  const siblingItems = siblings.slice(0, 12).map((sibling) => ({
    key: String(sibling.page.id),
    href: `/${locale}/topics/${buildLocalizedPath(sibling, byId, locale)}`,
    title: localizedTitle(sibling, locale),
    summary: localizedSummary(sibling, locale),
  }));
  const hasRelated = childrenItems.length > 0 || siblingItems.length > 0;

  const canonical = publicUrl(item, byId, contentLocale);
  const isDraftPreview = includeDrafts && !page.published;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: summary ?? undefined,
    datePublished: page.createdAt.toISOString(),
    dateModified: page.updatedAt.toISOString(),
    mainEntityOfPage: canonical,
    inLanguage: localeToBcp47[contentLocale] ?? contentLocale,
    image: ogImageUrl(page.path, locale),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("title"),
        item: `${SITE_URL}/${locale}/topics`,
      },
      ...[...ancestors, item].map((entry, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: localizedTitle(entry, locale),
        item: publicUrl(entry, byId, canonicalLocaleFor(entry, locale)),
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd([articleJsonLd, breadcrumbJsonLd]),
        }}
      />
      <DocsLayout
        toc={toc}
        sidebarExtras={
          hasRelated ? (
            <div className="space-y-4">
              {childrenItems.length > 0 && (
                <PageLinkList
                  compact
                  heading={t("pagesInSection")}
                  items={childrenItems}
                />
              )}
              {siblingItems.length > 0 && (
                <PageLinkList
                  compact
                  heading={t("relatedPages")}
                  items={siblingItems}
                />
              )}
            </div>
          ) : undefined
        }
        header={
          <header
            lang={contentLocale === locale ? undefined : contentLocale}
            dir={contentLocale === locale ? undefined : "ltr"}
          >
            <h1 className={PAGE_TITLE}>{title}</h1>
            {summary && (
              <p className="text-muted-foreground not-prose mt-2 mb-6 text-base">
                {summary}
              </p>
            )}
          </header>
        }
        preface={
          <>
            {isDraftPreview && (
              <div className="not-prose mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                Draft preview — this page is not published and is only visible
                to admins.
              </div>
            )}
            {/* Top-level pages link back to the hub; deeper pages get a
                trail of the hub and each ancestor (the H1 right below names
                the page itself). Styled like the summary under the title. */}
            {ancestors.length === 0 ? (
              <a
                href={`/${locale}/topics`}
                className="text-muted-foreground hover:text-foreground not-prose mb-8 inline-flex items-center gap-1.5 text-base underline-offset-4 hover:underline"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                {t("backToTopics")}
              </a>
            ) : (
              <nav
                aria-label="Breadcrumb"
                className="text-muted-foreground not-prose mb-8 text-base"
              >
                <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  {[
                    {
                      key: "hub",
                      href: `/${locale}/topics`,
                      title: tNav("topics"),
                    },
                    ...ancestors.map((ancestor) => ({
                      key: String(ancestor.page.id),
                      href: `/${locale}/topics/${buildLocalizedPath(ancestor, byId, locale)}`,
                      title: localizedTitle(ancestor, locale),
                    })),
                  ].map((crumb, index) => (
                    <li
                      key={crumb.key}
                      className="flex min-w-0 items-center gap-1.5"
                    >
                      {index > 0 && <span aria-hidden="true">/</span>}
                      {/* Short label, capped with an ellipsis; the full
                          title shows on hover. */}
                      <a
                        href={crumb.href}
                        title={crumb.title}
                        className="hover:text-foreground max-w-[12rem] truncate underline-offset-4 hover:underline sm:max-w-[18rem]"
                      >
                        {shortTitle(crumb.title)}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </>
        }
      >
        {/* Untranslated locales serve the English body: say so for crawlers
            and screen readers. */}
        <article
          lang={contentLocale === locale ? undefined : contentLocale}
          dir={contentLocale === locale ? undefined : "ltr"}
        >
          <div dangerouslySetInnerHTML={{ __html: html }} />

          <p className="not-prose text-muted-foreground mt-10 text-sm">
            {t("lastUpdated")}{" "}
            <time dateTime={page.updatedAt.toISOString()}>
              {page.updatedAt.toISOString().slice(0, 10)}
            </time>
            {page.published && page.viewsCount > 0 && (
              <>
                {" · "}
                {t("views", { count: page.viewsCount })}
              </>
            )}
            {page.isStub && ` · ${t("stubNotice")}`}
          </p>

          {/* Admins previewing/editing shouldn't inflate the count. */}
          {page.published && !includeDrafts && (
            <WikiViewTracker pageId={page.id} />
          )}

          {includeDrafts && (
            <WikiAdminActions
              path={page.path}
              published={page.published}
              locale={locale}
            />
          )}

          {/* Related-page navigation: sidebar on desktop (see sidebarExtras),
              in the page body when the sidebar is hidden (below xl) with a
              divider above */}
          {hasRelated && (
            <div className="not-prose mt-6 border-t pt-8 xl:hidden">
              <div className="space-y-8">
                {childrenItems.length > 0 && (
                  <PageLinkList
                    heading={t("pagesInSection")}
                    items={childrenItems}
                  />
                )}
                {siblingItems.length > 0 && (
                  <PageLinkList
                    heading={t("relatedPages")}
                    items={siblingItems}
                  />
                )}
              </div>
            </div>
          )}
        </article>
      </DocsLayout>
    </>
  );
}
