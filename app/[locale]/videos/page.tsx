"use server";
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
      url: "https://detrans.ai/videos",
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: "en_US",
      type: "website",
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
    <div className="prose dark:prose-invert pb-16 lg:max-w-none lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      <p className="text-muted-foreground max-w-3xl">
        {t("description.line1")}
        <br className="hidden md:inline" /> {t("description.line2")}
        <br className="hidden md:inline" /> {t("description.line3")}
      </p>

      <p className="max-w-3xl">
        <VideoSubmitForm />
      </p>

      <VideosList />
    </div>
  );
}
