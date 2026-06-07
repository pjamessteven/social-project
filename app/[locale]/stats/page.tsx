"use server";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localesInfo } from "@/i18n/locales";
import StoriesCharts from "../../components/charts/StoriesCharts";
import UsersFilters from "../../components/UsersFilters";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "statsPage" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    openGraph: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      url: `https://detrans.ai/${locale}/stats`,
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: locale === "en" ? "en_US" : locale === "fr" ? "fr_FR" : "es_ES",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadata.title"),
      description: t("metadata.description"),
    },
    alternates: {
      canonical: `https://detrans.ai/${locale}/stats`,
      languages: Object.fromEntries(
        localesInfo.map((l) => [
          l.code === "en"
            ? "en-US"
            : l.code === "es"
              ? "es-ES"
              : l.code === "fr"
                ? "fr-FR"
                : l.code === "zh-cn"
                  ? "zh-CN"
                  : l.code === "zh-tw"
                    ? "zh-TW"
                    : `${l.code}-${l.code.toUpperCase()}`,
          `https://detrans.ai/${l.code}/stats`,
        ]),
      ),
    },
  };
}

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ minAge?: string; maxAge?: string; sex?: string; tag?: string }>;
}) {
  const t = await getTranslations("statsPage");
  const resolvedSearchParams = await searchParams;

  return (
    <div className="prose dark:prose-invert pb-16 lg:max-w-none lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground max-w-3xl">{t("description")}</p>

      <div className="not-prose mt-8">
        <StoriesCharts resolvedSearchParams={resolvedSearchParams} />
        <UsersFilters />
      </div>
    </div>
  );
}
