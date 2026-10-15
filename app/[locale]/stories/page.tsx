import { countAllStories } from "@/app/api/stories/spotlight/count";
import StoriesSection from "@/app/components/charts/StoriesSection";
import { IntroWithSeeAlso } from "@/app/components/content/IntroWithSeeAlso";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import UsersFilters from "@/app/components/UsersFilters";
import {
  buildLocalizedAlternates,
  localeToBcp47,
  safeJsonLd,
  SITE_URL,
} from "@/app/lib/seo";
import { getStoriesPath } from "@/app/lib/story-urls";
import { getPathname, Link } from "@/i18n/routing";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "storiesPage" });
  const title = t("metadata.title");
  const description = t("metadata.description");
  const canonical = `${SITE_URL}${getStoriesPath(locale)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "detrans.ai",
      images: [`${SITE_URL}/x_card_lg.png`],
      locale: (localeToBcp47[locale] ?? locale).replace("-", "_"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical,
      languages: buildLocalizedAlternates("/stories"),
    },
  };
}

export default async function StoriesPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  // Filters live in the query string; reading it keeps the page dynamic.
  await searchParams;
  const t = await getTranslations({ locale, namespace: "storiesPage" });
  const storyCount = await countAllStories();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("title"),
    description: t("metadata.description"),
    url: `${SITE_URL}${getStoriesPath(locale)}`,
    inLanguage: localeToBcp47[locale] ?? locale,
    isPartOf: { "@type": "WebSite", name: "detrans.ai", url: SITE_URL },
    about: { "@type": "Thing", name: "detransition" },
  };

  return (
    // Wide layout like /videos so the story grid fits three columns.
    <div className="pb-16 lg:-mx-16 lg:pt-8 xl:-mx-48">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div>
        <h1 className={PAGE_TITLE}>{t("title")}</h1>
        <IntroWithSeeAlso
          className="mt-8"
          title={t("seeAlso.title")}
          links={[
            {
              label: t("seeAlso.links.videos"),
              href: getPathname({ href: "/videos", locale }),
            },
            {
              label: t("seeAlso.links.peakTrans"),
              href: "https://www.peaktrans.org/detransitioning/",
              external: true,
            },
            {
              label: t("seeAlso.links.postTrans"),
              href: "https://post-trans.com/",
              external: true,
            },
          ]}
        >
          {/* Same paragraph styling as the topics hub intro. */}
          <div className="text-muted-foreground space-y-3 text-base leading-relaxed">
            <p>
              {t.rich("description", {
                count: storyCount,
                reddit: (chunks) => (
                  <a
                    href="https://www.reddit.com/r/detrans/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
            <p>
              {t.rich("description2", {
                prompts: (chunks) => (
                  <Link href="/prompts" className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </IntroWithSeeAlso>

        <div className="mt-10">
          <UsersFilters layout="inline" />
        </div>

        <div className="mt-4">
          <StoriesSection />
        </div>
      </div>
    </div>
  );
}
