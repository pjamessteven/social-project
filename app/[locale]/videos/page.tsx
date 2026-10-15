"use server";
import { buildAlternates, localizedUrl, ogLocale } from "@/app/lib/seo";
import { IntroWithSeeAlso } from "@/app/components/content/IntroWithSeeAlso";
import { PAGE_TITLE } from "@/app/components/ui/typography";
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
      url: localizedUrl("/videos", locale),
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
    alternates: buildAlternates("/videos", locale),
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

      <IntroWithSeeAlso
        className="mt-8"
        title={t("seeAlso.title")}
        wideOnly
        links={[
          {
            label: t("seeAlso.hashtagOn", { platform: "Instagram" }),
            href: "https://www.instagram.com/explore/search/keyword/?q=%23detransition",
            external: true,
          },
          {
            label: t("seeAlso.hashtagOn", { platform: "TikTok" }),
            href: "https://www.tiktok.com/tag/detransition",
            external: true,
          },
        ]}
      >
        <p className="text-muted-foreground text-base leading-relaxed">
          {t("description.line1")}
          <br className="hidden md:inline" /> {t("description.line2")}
        </p>

        <div className="mt-6">
          <VideoSubmitForm />
        </div>
      </IntroWithSeeAlso>

      <VideosList />
    </div>
  );
}
