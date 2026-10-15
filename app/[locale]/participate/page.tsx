import { buildAlternates, localizedUrl, ogLocale } from "@/app/lib/seo";
import Studies from "./studies";

import { PAGE_TITLE } from "@/app/components/ui/typography";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "participatePage.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: localizedUrl("/participate", locale),
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: ogLocale(locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    alternates: buildAlternates("/participate", locale),
  };
}

export default async function ParticipatePage() {
  return (
    <div className="prose dark:prose-invert max-w-4xl pb-16 lg:pt-8">
      <h1 className={`mb-6 ${PAGE_TITLE}`}>Current Detransition Studies</h1>
      <p>
        Your voice matters. Academic researchers are actively studying
        detransition experiences to improve healthcare and support for
        individuals like you.
      </p>
      <p>
        By participating in these studies, you can help advance scientific
        understanding and contribute to better care for future generations. Your
        experiences are valuable and deserve to be heard.
      </p>
      <p className="mb-8">
        <i>Updated 14/7/26</i>
      </p>

      <Studies />

      <div className="not-prose mt-12 text-center">
        <p className="mb-4 text-lg text-gray-600 dark:text-gray-400">
          Check back regularly for new opportunities to contribute to research.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Your experiences matter and can help improve care for others going
          through similar journeys.
        </p>
      </div>
    </div>
  );
}
