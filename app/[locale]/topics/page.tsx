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
  const href = `/${locale}/topics/${node.path}`;
  return (
    <li>
      {heading ? (
        <h2 className="mt-6 mb-1">
          <a href={href} className="no-underline hover:underline">
            {node.title}
          </a>
        </h2>
      ) : (
        <a href={href} className="font-medium">
          {node.title}
        </a>
      )}
      {node.summary && (
        <p className="text-muted-foreground mt-0 mb-2 text-sm">
          {node.summary}
        </p>
      )}
      {node.children.length > 0 && (
        <ul className="mt-2 ml-5 space-y-3">
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
      url: `${SITE_URL}/${locale}/topics/${node.path}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionJsonLd) }}
      />
      <DocsLayout toc={[]}>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground not-prose mt-2 mb-6 text-base">
          {t("description")}
        </p>

        {tree.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-4">
            {tree.map((node) => (
              <TopicEntry key={node.path} node={node} locale={locale} heading />
            ))}
          </ul>
        )}
      </DocsLayout>
    </>
  );
}
