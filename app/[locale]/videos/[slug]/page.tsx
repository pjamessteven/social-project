"use server";

import {
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
  parseVideoIdFromSlug,
} from "@/app/lib/video-utils";
import { localesInfo } from "@/i18n/locales";
import { Link } from "@/i18n/routing";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface VideoPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

interface VideoWithTranslations {
  id: number;
  title: string;
  author: string;
  sex: "m" | "f";
  url: string;
  type: string;
  processed: boolean;
  transcript: string | null;
  description: string | null;
  summary: string | null;
  bite: string | null;
  duration: number | null;
  date: Date | null;
  descriptionTranslation: string | null;
  summaryTranslation: string | null;
  biteTranslation: string | null;
  titleTranslation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

async function fetchVideo(
  videoId: number,
  locale: string
): Promise<VideoWithTranslations | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/videos/${videoId}?locale=${locale}`;

    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.video as VideoWithTranslations;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch video:", error);
    return null;
  }
}

function getLocalizedField(
  defaultValue: string | null,
  translationsJson: string | null,
  locale: string,
): string | null {
  if (!translationsJson) return defaultValue;

  try {
    const translations = JSON.parse(translationsJson) as Record<string, string>;
    return translations[locale] || defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function generateMetadata({
  params,
}: VideoPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "videos" });
  const videoId = parseVideoIdFromSlug(slug);

  if (!videoId) {
    return {
      title: `Video Not Found | detrans.ai`,
      description: "The requested video could not be found.",
    };
  }

  const video = await fetchVideo(videoId, locale);

  if (!video) {
    return {
      title: `Video Not Found | detrans.ai`,
      description: "The requested video could not be found.",
    };
  }

  const localizedTitle = getLocalizedField(
    video.title,
    video.titleTranslation,
    locale,
  );
  const localizedDescription = getLocalizedField(
    video.description,
    video.descriptionTranslation,
    locale,
  );

  const youtubeVideoId = getYouTubeVideoId(video.url);
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;

  return {
    title: `${localizedTitle} | detrans.ai`,
    description:
      localizedDescription ||
      t("metadataWatchDescription", {
        title: localizedTitle ?? "",
        author: video.author,
        sex: video.sex === "f" ? t("female") : t("male"),
      }),
    openGraph: {
      title: `${localizedTitle} | detrans.ai`,
      description:
        localizedDescription ||
        t("metadataWatchDescription", {
          title: localizedTitle ?? "",
          author: video.author,
          sex: video.sex === "f" ? t("female") : t("male"),
        }),
      url: `https://detrans.ai/${locale}/videos/${slug}`,
      siteName: "detrans.ai",
      images: [
        {
          url: thumbnailUrl,
          width: 1280,
          height: 720,
          alt: t("metadataThumbnailAlt", { title: localizedTitle ?? "" }),
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${localizedTitle} | detrans.ai`,
      description:
        localizedDescription ||
        t("metadataWatchDescription", {
          title: localizedTitle ?? "",
          author: video.author,
          sex: video.sex === "f" ? t("female") : t("male"),
        }),
      images: [thumbnailUrl],
    },
    alternates: {
      canonical: `https://detrans.ai/${locale}/videos/${slug}`,
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
          `https://detrans.ai/${l.code}/videos/${slug}`,
        ]),
      ),
    },
  };
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "videos" });
  const videoId = parseVideoIdFromSlug(slug);

  if (!videoId) {
    notFound();
  }

  const video = await fetchVideo(videoId, locale);

  if (!video) {
    notFound();
  }

  const localizedTitle = getLocalizedField(
    video.title,
    video.titleTranslation,
    locale,
  );
  const localizedDescription = getLocalizedField(
    video.description,
    video.descriptionTranslation,
    locale,
  );
  const localizedSummary = getLocalizedField(
    video.summary,
    video.summaryTranslation,
    locale,
  );
  const localizedBite = getLocalizedField(
    video.bite,
    video.biteTranslation,
    locale,
  );

  const youtubeVideoId = getYouTubeVideoId(video.url);
  const embedUrl = getYouTubeEmbedUrl(youtubeVideoId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: localizedTitle,
    description: localizedDescription || localizedSummary,
    thumbnailUrl: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
    uploadDate: video.createdAt,
    duration: video.duration ? `PT${video.duration}S` : undefined,
    contentUrl: video.url,
    embedUrl: embedUrl,
    author: {
      "@type": "Person",
      name: video.author,
    },
    publisher: {
      "@type": "Organization",
      name: "detrans.ai",
      url: "https://detrans.ai",
    },
    url: `https://detrans.ai/${locale}/videos/${slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://detrans.ai/${locale}/videos/${slug}`,
    },
    about: {
      "@type": "Thing",
      name: "detransition",
    },
  };

  return (
    <div className="prose dark:prose-invert pb-16 lg:max-w-none lg:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-8">
        <Link
          href="/videos"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          &larr; {t("backToAll")}
        </Link>
      </div>

      <h1 className="mb-0 text-3xl font-bold">{localizedTitle}</h1>
      {localizedBite && (
        <h3 className="text-muted-foreground text-lg lg:text-xl">
          {localizedBite}
        </h3>
      )}
      {/* YouTube Embed */}
      <div className="mt-8">
        <div className="relative h-0 overflow-hidden rounded-lg pb-[56.25%]">
          <iframe
            src={embedUrl}
            title={localizedTitle ?? ""}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 h-full w-full border-0"
          />
        </div>
      </div>

      {/* Video Metadata Grid */}
      <div className="mb-8 grid grid-cols-1 gap-8">
        <div className="space-y-6">
          {/* Summary */}
          {localizedSummary && (
            <div>
              <h3 className="mb-2 font-semibold">{t("overview")}</h3>
              <p className="border-t pt-4 leading-relaxed">
                {localizedSummary}
              </p>
            </div>
          )}
          {/* Description */}
          {localizedDescription && (
            <div>
              <h3 className="mb-2 font-semibold">{t("fullSummary")}</h3>
              <p className="border-t pt-4 leading-relaxed whitespace-break-spaces">
                {localizedDescription}
              </p>
              <div className="mt-4">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t("watchOnYouTube")} &rarr;
                </a>
              </div>
            </div>
          )}
          <div></div>
        </div>
      </div>
    </div>
  );
}
