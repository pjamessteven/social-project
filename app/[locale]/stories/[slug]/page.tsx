import { formatUpvotes } from "@/app/components/charts/story";
import { localeToBcp47, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import { getStory, type StoryPageData } from "@/app/lib/stories";
import {
  getStoriesPath,
  getStoryPath,
  parseStoryId,
} from "@/app/lib/story-urls";
import { localesInfo } from "@/i18n/locales";
import { ArrowLeft, ChartNoAxesCombined, Triangle } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

type PageParams = Promise<{ locale: string; slug: string }>;

const META_DESCRIPTION_LENGTH = 160;

/** Request-cached lookup shared by generateMetadata and the page. */
async function loadStory(slug: string): Promise<StoryPageData | null> {
  const id = parseStoryId(slug);
  return id ? getStory(id) : null;
}

function localized(
  translations: Record<string, string>,
  locale: string,
  fallback: string | null,
): string | null {
  return translations[locale] ?? fallback;
}

/** Plain-text description cut at a word boundary for meta tags. */
function toMetaDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= META_DESCRIPTION_LENGTH) return clean;
  const slice = clean.slice(0, META_DESCRIPTION_LENGTH - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/**
 * Untranslated stories are served in every locale (the page chrome is
 * localized) but canonicalize to English, so search engines index one copy
 * of the text instead of 31 duplicates. Translated locales self-canonicalize
 * and are linked as hreflang alternates.
 */
function canonicalLocale(story: StoryPageData, locale: string): string {
  return story.translatedLocales.includes(locale) ? locale : "en";
}

function tagLabel(tag: StoryPageData["tags"][number], locale: string): string {
  const label = tag.translations[locale] ?? tag.name;
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = await loadStory(slug);
  const t = await getTranslations({ locale, namespace: "storiesPage" });

  if (!story) {
    return {
      title: t("story.notFound"),
      robots: { index: false, follow: false },
    };
  }

  const title = story.title || t("story.untitled");
  const summary = localized(story.summaryTranslations, locale, story.summary);
  const description = toMetaDescription(
    summary ||
      localized(story.experienceTranslations, locale, story.experience) ||
      t("metadata.description"),
  );
  const canonical = `${SITE_URL}${getStoryPath(
    canonicalLocale(story, locale),
    story.slug,
  )}`;

  const languages: Record<string, string> = {};
  for (const info of localesInfo) {
    if (!story.translatedLocales.includes(info.code)) continue;
    languages[localeToBcp47[info.code] ?? info.code] =
      `${SITE_URL}${getStoryPath(info.code, story.slug)}`;
  }
  languages["x-default"] = `${SITE_URL}${getStoryPath("en", story.slug)}`;

  const metaTitle = t("story.metaTitle", { title });
  const keywords = story.tags.map((tag) => tagLabel(tag, locale));

  return {
    title: metaTitle,
    description,
    keywords,
    // Stories outside the public listing (flagged, too thin, unconfirmed
    // status) stay reachable for existing links but are never indexed.
    robots: story.listed ? undefined : { index: false, follow: true },
    openGraph: {
      title: metaTitle,
      description,
      url: canonical,
      siteName: "detrans.ai",
      images: [`${SITE_URL}/x_card_lg.png`],
      locale: (localeToBcp47[locale] ?? locale).replace("-", "_"),
      type: "article",
      modifiedTime: story.updatedAt?.toISOString(),
      tags: keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description,
    },
    alternates: {
      canonical,
      languages,
    },
  };
}

export default async function StoryPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const story = await loadStory(slug);

  if (!story) {
    notFound();
  }

  // Bare ids and stale title slugs land on the canonical URL.
  if (encodeURIComponent(story.slug) !== slug) {
    permanentRedirect(getStoryPath(locale, story.slug));
  }

  const t = await getTranslations({ locale, namespace: "storiesPage" });
  const tStory = await getTranslations({
    locale,
    namespace: "statsPage.stories",
  });
  const tDisclaimer = await getTranslations({
    locale,
    namespace: "stories.disclaimer",
  });

  const title = story.title || t("story.untitled");
  const summary = localized(story.summaryTranslations, locale, story.summary);
  const experience = localized(
    story.experienceTranslations,
    locale,
    story.experience,
  );

  const desisted = story.status === "desisted";
  const outcomeLabel = desisted
    ? tStory("ages.desistance")
    : tStory("ages.detransition");
  const ages = [
    { label: tStory("ages.firstDysphoria"), age: story.ages.firstDysphoria },
    {
      // Desisters had no medical intervention, so any transition they
      // describe was social only.
      label: desisted
        ? tStory("ages.socialTransition")
        : tStory("ages.transition"),
      age: story.ages.transition,
    },
    { label: outcomeLabel, age: story.ages.detransition },
  ].filter(
    (entry): entry is { label: string; age: number } => entry.age != null,
  );
  const meta = [
    story.sex === "f"
      ? tStory("female")
      : story.sex === "m"
        ? tStory("male")
        : null,
    story.status ? tStory(`status.${story.status}`) : null,
  ].filter(Boolean);

  const tags = story.tags
    .map((tag) => ({ name: tag.name, label: tagLabel(tag, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  const storiesPath = getStoriesPath(locale);
  const storyUrl = `${SITE_URL}${getStoryPath(locale, story.slug)}`;
  const description = summary || experience || "";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: toMetaDescription(description),
      url: storyUrl,
      mainEntityOfPage: { "@type": "WebPage", "@id": storyUrl },
      inLanguage: story.translatedLocales.includes(locale)
        ? (localeToBcp47[locale] ?? locale)
        : "en-US",
      dateModified: story.updatedAt?.toISOString(),
      keywords: tags.map((tag) => tag.label).join(", "),
      about: { "@type": "Thing", name: "detransition" },
      isAccessibleForFree: true,
      publisher: {
        "@type": "Organization",
        name: "detrans.ai",
        url: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "detrans.ai",
          item: `${SITE_URL}/${locale}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t("title"),
          item: `${SITE_URL}${storiesPath}`,
        },
        { "@type": "ListItem", position: 3, name: title, item: storyUrl },
      ],
    },
  ];

  return (
    <div className="flex min-h-full w-full justify-center pb-16 lg:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <article className="w-full max-w-3xl">
        <Link
          href={storiesPath}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {t("allStories")}
        </Link>

        <header className="mt-4">
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
            {title}
          </h1>
          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            {meta.length > 0 && <span>{meta.join(" · ")}</span>}
            {ages.length >= 2 && (
              <span title={tStory("agesCaption", { outcome: outcomeLabel })}>
                {ages.map((entry) => `${entry.label} ${entry.age}`).join(" → ")}
              </span>
            )}
            {story.upvotes !== 0 && (
              <span
                className="flex items-center gap-1 text-orange-500"
                title={tStory("upvotesLabel", {
                  count: formatUpvotes(story.upvotes, locale),
                })}
              >
                <Triangle aria-hidden className="h-2.5 w-2.5 fill-current" />
                {formatUpvotes(story.upvotes, locale)}
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <ul
              className="mt-4 flex flex-wrap gap-1.5"
              aria-label={t("story.tags")}
            >
              {tags.map((tag) => (
                <li key={tag.name}>
                  <Link
                    href={`${storiesPath}?tag=${encodeURIComponent(tag.name)}`}
                    className="inline-block rounded-full border bg-gray-100 px-2.5 py-0.5 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {tag.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </header>

        <details className="text-muted-foreground mt-6">
          <summary className="cursor-pointer italic">
            {tDisclaimer("summary")}
          </summary>
          <div className="mt-2 space-y-2">
            <p>{tDisclaimer("details")}</p>
            <p>{tDisclaimer("accuracy")}</p>
          </div>
        </details>

        {summary && (
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-semibold">
              {tStory("dialog.summary")}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              {summary}
            </p>
          </section>
        )}

        {experience && (
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-semibold">
              {tStory("dialog.fullStory")}
            </h2>
            <div className="text-base leading-relaxed whitespace-pre-line">
              {experience}
            </div>
          </section>
        )}

        <footer className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t pt-6">
          <Link
            href={storiesPath}
            className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {t("story.moreStories")}
          </Link>
          <Link
            href={`/${locale}/stats`}
            className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
          >
            <ChartNoAxesCombined aria-hidden className="h-4 w-4" />
            {t("statsLink")}
          </Link>
        </footer>
      </article>
    </div>
  );
}
