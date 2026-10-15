import { IntroWithSeeAlso } from "@/app/components/content/IntroWithSeeAlso";
import { TopicHubAccordion } from "@/app/components/content/TopicHubAccordion";
import TopicSuggestForm from "@/app/components/TopicSuggestForm";
import { LinkCard } from "@/app/components/ui/card";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import type { LocalizedTopicNode } from "@/app/lib/pages";
import { getLocalizedPageTree } from "@/app/lib/pages";
import { buildLocalizedAlternates, safeJsonLd, SITE_URL } from "@/app/lib/seo";
import { getPathname } from "@/i18n/routing";
import {
  ArrowRight,
  BookOpen,
  Fingerprint,
  HeartHandshake,
  IdCard,
  Lightbulb,
  type LucideIcon,
  Megaphone,
  MessagesSquare,
  Puzzle,
  RotateCcw,
  Stethoscope,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Public /topics hub: lists every published wiki topic with its localized
 * summary, nested under its parent topic. Visible to all users.
 */
/**
 * Both intro paragraphs as one meta description: the first is only a short
 * scope line, too thin on its own for search results. CJK text joins
 * sentences without a space.
 */
function fullDescription(
  t: Awaited<ReturnType<typeof getTranslations<"topicsPage">>>,
  locale: string,
): string {
  const separator = /^(ja|zh)/.test(locale) ? "" : " ";
  return `${t("description")}${separator}${t("description2")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "topicsPage" });
  const description = fullDescription(t, locale);

  return {
    title: `${t("title")} | detrans.ai`,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/topics`,
      languages: buildLocalizedAlternates("/topics"),
    },
    openGraph: {
      title: t("title"),
      description,
      url: `${SITE_URL}/${locale}/topics`,
      siteName: "detrans.ai",
      images: [`${SITE_URL}/x_card_lg.png`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description,
    },
    robots: { index: true, follow: true },
  };
}

// Icons for the top-level hub cards, keyed by default-locale path. New hubs
// fall back to a generic book.
const HUB_ICONS: Record<string, LucideIcon> = {
  "causes-and-correlates": Puzzle,
  communities: MessagesSquare,
  detransition: RotateCcw,
  feminism: Megaphone,
  "gender-identity-beliefs": Fingerprint,
  "medical-transition": Stethoscope,
  "parents-and-families": HeartHandshake,
  "reasons-for-detransition": Lightbulb,
  "social-transition": IdCard,
};

// Display order of the top-level hubs (cards and the full list), keyed by
// default-locale path: detransition itself first, then transition and
// identity, then wider context. Hubs not listed follow alphabetically.
const HUB_ORDER = [
  "detransition",
  "causes-and-correlates",
  "reasons-for-detransition",
  "gender-identity-beliefs",
  "social-transition",
  "medical-transition",
  "feminism",
  "communities",
  "parents-and-families",
];

function hubRank(path: string): number {
  const index = HUB_ORDER.indexOf(path);
  return index === -1 ? HUB_ORDER.length : index;
}

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
    <div className="not-prose mb-24 hidden grid-cols-2 gap-4 md:grid lg:grid-cols-3">
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
                className="text-foreground -mr-1 -mb-1 h-10 w-10 shrink-0 opacity-[0.12] transition-opacity group-hover:opacity-[0.22]"
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

// Rough rendered height of an index entry, in "article rows": an article
// with its two-line summary is one row; each nested entry (one-line summary)
// about half.
function entryWeight(node: LocalizedTopicNode, depth = 2): number {
  const own = depth === 2 ? 1 : 0.55;
  return node.children.reduce(
    (total, child) => total + entryWeight(child, depth + 1),
    own,
  );
}

/**
 * Splits `weights` (in order) into at most `columns` contiguous runs whose
 * largest total is as small as possible, and returns the index each run
 * after the first starts at. Lists are short, so a simple DP is plenty.
 */
function balancedColumnStarts(weights: number[], columns: number): number[] {
  const n = weights.length;
  const k = Math.min(columns, n);
  if (k <= 1) return [];
  const prefix = [0];
  for (const weight of weights) prefix.push(prefix[prefix.length - 1] + weight);
  // best[c][i]: smallest possible tallest column putting the first i entries
  // into c columns; cut[c][i]: where the last of those columns starts.
  const best = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
  const cut = Array.from({ length: k + 1 }, () => Array(n + 1).fill(0));
  best[0][0] = 0;
  for (let c = 1; c <= k; c++) {
    for (let i = c; i <= n; i++) {
      for (let j = c - 1; j < i; j++) {
        const tallest = Math.max(best[c - 1][j], prefix[i] - prefix[j]);
        if (tallest < best[c][i]) {
          best[c][i] = tallest;
          cut[c][i] = j;
        }
      }
    }
  }
  const starts: number[] = [];
  for (let c = k, i = n; c > 1; c--) {
    i = cut[c][i];
    starts.unshift(i);
  }
  return starts;
}

/**
 * One hub in the "All articles" index: the hub's title and summary, then its
 * articles in columns. For hubs with nested articles the column split is
 * chosen here (keeping reading order, never splitting a family) rather than
 * left to the browser's height balancing, which made lopsided or empty
 * columns. Flat hubs use a grid: their items are similar heights, so rows
 * line up.
 * Detail steps down with depth: articles get a two-line summary, and every
 * nested entry below them one line. Clamped summaries show in full on hover.
 */
function HubIndexSection({
  node,
  locale,
}: {
  node: LocalizedTopicNode;
  locale: string;
}) {
  const nested = node.children.some((child) => child.children.length > 0);
  const weights = node.children.map((child) => entryWeight(child));
  const twoColumnStarts = balancedColumnStarts(weights, 2);
  const threeColumnStarts = balancedColumnStarts(weights, 3);
  // From xl the three columns are real containers (one list each), so the
  // split is exactly the balanced one in every browser. Below xl those lists
  // are `display: contents` and their items flow into a 2-column multicol,
  // with a forced break where the balanced 2-column split starts (browsers
  // that ignore it just balance by height, which can't leave a column empty).
  const columnGroups = [0, ...threeColumnStarts].map((start, column) =>
    node.children
      .map((child, index) => ({ child, index }))
      .slice(start, threeColumnStarts[column] ?? node.children.length),
  );
  const href = `/${locale}/topics/${node.localizedPath}`;
  const Icon = HUB_ICONS[node.path] ?? BookOpen;
  return (
    <TopicHubAccordion
      id={node.path}
      title={node.title}
      summary={node.summary}
      icon={
        <Icon
          className="text-foreground h-14 w-14 shrink-0 opacity-[0.12]"
          strokeWidth={1.5}
          aria-hidden
        />
      }
      desktopHeader={
        // Title and summary form one link target; hovering anywhere in it
        // underlines the title.
        <a href={href} className="group block max-w-4xl">
          <h3 className="text-xl leading-snug font-semibold decoration-1 underline-offset-4 group-hover:underline">
            {node.title}
          </h3>
          {node.summary && (
            <p className="text-muted-foreground mt-1 text-base">
              {node.summary}
            </p>
          )}
        </a>
      }
    >
      {/* On mobile the header toggles the panel, so the hub's own page is
          the panel's first entry. */}
      <a
        href={href}
        className="mb-6 block text-base leading-snug font-semibold decoration-1 underline-offset-4 hover:underline md:hidden"
      >
        {node.title}
        <ArrowRight
          className="ml-1.5 inline h-4 w-4 align-[-0.15em] rtl:rotate-180"
          aria-hidden
        />
      </a>
      {node.children.length > 0 &&
        (nested ? (
          <div className="border-border gap-x-10 md:mt-5 md:columns-2 md:border-t md:pt-6 xl:grid xl:columns-auto xl:grid-cols-3 xl:items-start">
            {columnGroups.map((group) => (
              <ul
                key={group[0].child.path}
                className="contents xl:block xl:min-w-0"
              >
                {group.map(({ child, index }) => (
                  <li
                    key={child.path}
                    className={`mb-6 break-inside-avoid ${
                      twoColumnStarts.includes(index)
                        ? "md:max-xl:break-before-column"
                        : ""
                    }`}
                  >
                    <IndexEntry node={child} locale={locale} depth={2} />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ) : (
          <ul className="border-border grid grid-cols-1 items-start gap-x-10 gap-y-6 md:mt-5 md:grid-cols-2 md:border-t md:pt-6 xl:grid-cols-3">
            {node.children.map((child) => (
              <li key={child.path}>
                <IndexEntry node={child} locale={locale} depth={2} />
              </li>
            ))}
          </ul>
        ))}
    </TopicHubAccordion>
  );
}

function IndexEntry({
  node,
  locale,
  depth,
}: {
  node: LocalizedTopicNode;
  locale: string;
  /** 2 = article under a hub, 3+ = nested under it. */
  depth: number;
}) {
  const summaryClass =
    depth === 2
      ? "text-muted-foreground mt-0.5 line-clamp-2 text-sm leading-relaxed"
      : "text-muted-foreground mt-0.5 line-clamp-1 text-sm";
  return (
    <>
      <a
        href={`/${locale}/topics/${node.localizedPath}`}
        className="group block"
        title={node.summary ?? undefined}
      >
        <span
          className={`block leading-snug decoration-1 underline-offset-4 group-hover:underline ${
            depth === 2 ? "text-base font-semibold" : "text-sm font-semibold"
          }`}
        >
          {node.title}
        </span>
        {node.summary && <p className={summaryClass}>{node.summary}</p>}
      </a>
      {node.children.length > 0 && (
        // A thin rule down the side ties each level to its parent.
        <ul className="border-muted-foreground/25 mt-3 ml-0.5 space-y-3 border-l pl-3">
          {node.children.map((child) => (
            <li key={child.path}>
              <IndexEntry node={child} locale={locale} depth={depth + 1} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// Section labels stay small and muted so the page title, hub cards and
// article titles carry the hierarchy.
const SECTION_HEADING =
  "not-prose text-muted-foreground mb-6 text-sm font-semibold tracking-wide uppercase";

export default async function TopicsHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "topicsPage" });
  // The tree arrives sorted by path; the sort is stable, so unlisted hubs
  // keep that order after the listed ones.
  const tree = (await getLocalizedPageTree(locale)).sort(
    (a, b) => hubRank(a.path) - hubRank(b.path),
  );
  // "See also" labels are the target pages' own (already translated) titles.
  const tStats = await getTranslations({ locale, namespace: "statsPage" });
  const tStudies = await getTranslations({ locale, namespace: "studiesPage" });
  const tStories = await getTranslations({ locale, namespace: "storiesPage" });
  const seeAlso = [
    { label: tStats("title"), href: getPathname({ href: "/stats", locale }) },
    {
      label: tStudies("title"),
      href: getPathname({ href: "/studies", locale }),
    },
    {
      label: tStories("title"),
      href: getPathname({ href: "/stories", locale }),
    },
  ];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("title"),
    description: fullDescription(t, locale),
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
      {/* Wider than the 48rem app column from lg: a viewport-relative width
          centred by the flex parent, so it never overflows the viewport. */}
      <div className="lg:flex lg:justify-center">
        <div className="prose dark:prose-invert pb-16 lg:w-[min(70rem,calc(100vw_-_3rem))] lg:max-w-none lg:shrink-0 lg:pt-8">
          <header>
            <h1 className={PAGE_TITLE}>{t("title")}</h1>
            <IntroWithSeeAlso
              className="mt-2 mb-12"
              title={tStories("seeAlso.title")}
              links={seeAlso}
            >
              {/* Same paragraph styling as the studies hub intro. */}
              <div className="text-muted-foreground space-y-3 text-base leading-relaxed">
                <p>{t("description")}</p>
                <p>{t("description2")}</p>
              </div>
              {/* Under the description, beside the See also links, so the
                taller link column doesn't leave a gap above it. The form's
                own bottom margin is dropped: the intro spaces itself. */}
              <div className="mt-4 *:mb-0">
                <TopicSuggestForm />
              </div>
            </IntroWithSeeAlso>
          </header>
          {tree.length === 0 ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              {/* Mobile gets the hubs as the accordion below instead of cards. */}

              <HubCards
                tree={tree}
                locale={locale}
                articleCount={(count) => t("articleCount", { count })}
              />
              {/* On very wide screens the index reaches past the page
                  column (there's room: the column is capped at 70rem) so its
                  three columns get a comfortable line length. */}
              {/* A full-bleed band sets the index apart from the hub cards:
                  a top rule and a muted gradient fading out below it, like
                  the start page's. The page scroller clips its overflow. */}
              <div className="not-prose relative isolate -mb-16 pt-12 pb-16 md:pt-11 2xl:-mx-24">
                <div
                  aria-hidden
                  className="from-secondary/50 absolute top-0 -left-[5000px] -z-10 h-[32rem] w-[10000px] border-t bg-linear-to-b to-transparent"
                />
                <h2 className="mb-3 text-2xl leading-tight font-bold md:mb-10">
                  {t("allArticlesHeading")}:
                </h2>
                {tree.map((node) => (
                  <HubIndexSection
                    key={node.path}
                    node={node}
                    locale={locale}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
