"use server";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import { localesInfo } from "@/i18n/locales";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import SeoVideosList from "../../components/SeoVideosList";
import VideosList from "../../components/VideosList";
import VideoSubmitForm from "../../components/VideoSubmitForm";
import { isBot } from "../../lib/isBot";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "videos.metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `https://detrans.ai/${locale}/videos`,
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    alternates: {
      canonical: `https://detrans.ai/${locale}/videos`,
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
          `https://detrans.ai/${l.code}/videos`,
        ]),
      ),
    },
  };
}

export default async function VideosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "videos" });
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  if (bot) {
    return <SeoVideosList locale={locale} />;
  }
  return (
    <div className="prose dark:prose-invert pb-16 lg:-mx-16 lg:max-w-none lg:pt-8 xl:-mx-48">
      <h1 className={PAGE_TITLE}>{t("title")}</h1>

      <p className="text-muted-foreground max-w-3xl text-base leading-relaxed">
        {t("description.line1")}
        <br className="hidden md:inline" /> {t("description.line2")}
      </p>

      <p className="max-w-3xl">
        <VideoSubmitForm />
      </p>

      <VideosList />
    </div>
  );
}
