import { LinkCard } from "@/app/components/ui/card";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import type { LocalizedTopicNode } from "@/app/lib/pages";
import { getLocalizedPageTree } from "@/app/lib/pages";
import { buildLocalizedAlternates, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Lightbulb,
  type LucideIcon,
  RotateCcw,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Public /topics hub: lists every published wiki topic with its localized
 * summary, nested under its parent topic. Visible to all users.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "topicsPage" });

  return {
    title: `${t("title")} | detrans.ai`,
    description: t("description"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/topics`,
      languages: buildLocalizedAlternates("/topics"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${SITE_URL}/${locale}/topics`,
      siteName: "detrans.ai",
      images: [`${SITE_URL}/x_card_lg.png`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    robots: { index: true, follow: true },
  };
}

// Icons for the top-level hub cards, keyed by default-locale path. New hubs
// fall back to a generic book.
const HUB_ICONS: Record<string, LucideIcon> = {
  "causes-and-correlates": Brain,
  communities: Users,
  detransition: RotateCcw,
  "gender-identity-beliefs": Lightbulb,
  "medical-transition": Stethoscope,
  "social-transition": UserRound,
};

function countDescendants(node: LocalizedTopicNode): number {
  return node.children.reduce(
    (total, child) => total + 1 + countDescendants(child),
    0,
  );
}

function HubCards({
  tree,
  locale,
  articleCount,
}: {
  tree: LocalizedTopicNode[];
  locale: string;
  articleCount: (count: number) => string;
}) {
  return (
    <div className="not-prose mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tree.map((node) => {
        const Icon = HUB_ICONS[node.path] ?? BookOpen;
        return (
          <LinkCard
            key={node.path}
            href={`/${locale}/topics/${node.localizedPath}`}
          >
            <h2 className="text-lg leading-snug font-semibold">{node.title}</h2>
            {node.summary && (
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {node.summary}
              </p>
            )}
            {/* The icon shares the bottom row with the count, so it sits in
                the corner without ever overlapping the summary. */}
            <div className="mt-auto flex items-end justify-between gap-3 pt-3">
              <span className="text-muted-foreground group-hover:text-foreground flex items-center gap-1 text-xs font-medium">
                {articleCount(countDescendants(node) + 1)}
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <Icon
                className="text-foreground -mr-1 -mb-1 h-10 w-10 shrink-0 opacity-[0.08] transition-opacity group-hover:opacity-[0.14]"
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
          </LinkCard>
        );
      })}
    </div>
  );
}

function TopicEntry({
  node,
  locale,
  heading,
}: {
  node: LocalizedTopicNode;
  locale: string;
  heading: boolean;
}) {
  const href = `/${locale}/topics/${node.localizedPath}`;
  return (
    // Prose sets li margins, so the gap after a top-level section has to win
    // over it explicitly.
    <li className={heading ? "!mb-12 pl-0" : "pl-0"}>
      {/* Title and summary form one link target; hovering anywhere in it
          underlines the title. */}
      <a href={href} className="group block font-normal no-underline">
        {heading ? (
          <h2
            id={node.path}
            className="mt-6 mb-1 text-xl font-semibold decoration-1 underline-offset-4 group-hover:underline"
          >
            {node.title}
          </h2>
        ) : (
          <span className="text-base font-semibold decoration-1 underline-offset-4 group-hover:underline">
            {node.title}
          </span>
        )}
        {node.summary && (
          <p className="text-muted-foreground mt-0 mb-2 text-base">
            {node.summary}
          </p>
        )}
      </a>
      {node.children.length > 0 && (
        // A thin rule down the side ties each level to its parent.
        <ul className="border-muted-foreground/25 mt-3 mb-6 ml-0.5 list-none space-y-8 border-l pl-3 sm:pl-5">
          {node.children.map((child) => (
            <TopicEntry
              key={child.path}
              node={child}
              locale={locale}
              heading={false}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

const SECTION_HEADING =
  "not-prose mb-6 text-2xl leading-tight font-bold sm:text-3xl";

export default async function TopicsHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "topicsPage" });
  const tree = await getLocalizedPageTree(locale);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("title"),
    description: t("description"),
    url: `${SITE_URL}/${locale}/topics`,
    inLanguage: locale,
    hasPart: tree.map((node) => ({
      "@type": "Article",
      name: node.title,
      description: node.summary ?? undefined,
      url: `${SITE_URL}/${locale}/topics/${node.localizedPath}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionJsonLd) }}
      />
      <div className="prose dark:prose-invert pb-16 lg:-mx-48 lg:max-w-none lg:pt-8">
        <header>
          <h1 className={PAGE_TITLE}>{t("title")}</h1>
          <p className="text-muted-foreground not-prose mt-2 mb-10 max-w-3xl text-base">
            {t("description")}
          </p>
        </header>
        {tree.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <h2 className={SECTION_HEADING}>{t("hubsHeading")}</h2>
            <HubCards
              tree={tree}
              locale={locale}
              articleCount={(count) => t("articleCount", { count })}
            />
            <h2 className={SECTION_HEADING}>{t("allArticlesHeading")}</h2>
            <ul className="max-w-4xl list-none pl-0">
              {tree.map((node) => (
                <TopicEntry
                  key={node.path}
                  node={node}
                  locale={locale}
                  heading
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
