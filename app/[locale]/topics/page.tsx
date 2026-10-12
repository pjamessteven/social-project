import { DocsLayout } from "@/app/components/content/DocsLayout";
import type { LocalizedTopicNode } from "@/app/lib/pages";
import { getLocalizedPageTree } from "@/app/lib/pages";
import { buildLocalizedAlternates, safeJsonLd, SITE_URL } from "@/app/lib/seo";
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
            className="mt-6 mb-1 decoration-1 underline-offset-4 group-hover:underline"
          >
            {node.title}
          </h2>
        ) : (
          <span className="font-medium decoration-1 underline-offset-4 group-hover:underline">
            {node.title}
          </span>
        )}
        {node.summary && (
          <p className="text-muted-foreground mt-0 mb-2 text-sm">
            {node.summary}
          </p>
        )}
      </a>
      {node.children.length > 0 && (
        // A thin rule down the side ties each level to its parent.
        <ul className="border-muted-foreground/25 mt-2 mb-6 ml-0.5 list-none space-y-3 border-l pl-3 sm:pl-5">
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

  // Sidebar TOC covers the top-level topics only (their h2s carry the ids).
  const toc = tree.map((node) => ({
    id: node.path,
    text: node.title,
    level: 2,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionJsonLd) }}
      />
      <DocsLayout
        toc={toc}
        header={
          <header>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground not-prose mt-2 mb-6 text-base">
              {t("description")}
            </p>
          </header>
        }
      >
        {tree.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="list-none pl-0">
            {tree.map((node) => (
              <TopicEntry key={node.path} node={node} locale={locale} heading />
            ))}
          </ul>
        )}
      </DocsLayout>
    </>
  );
}
