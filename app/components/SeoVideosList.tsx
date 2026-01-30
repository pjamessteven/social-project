"use server";

import { generateVideoSlug } from "@/app/lib/video-utils";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

interface Video {
  id: number;
  title: string;
  author: string;
  sex: "m" | "f";
  url: string;
  type: string;
  description: string | null;
  summary: string | null;
  bite: string | null;
  descriptionTranslation: string | null;
  summaryTranslation: string | null;
  biteTranslation: string | null;
  titleTranslation: string | null;
}

function getLocalizedField(
  defaultValue: string | null,
  translationsJson: string | null,
  locale: string
): string | null {
  if (!translationsJson) return defaultValue;

  try {
    const translations = JSON.parse(translationsJson) as Record<string, string>;
    return translations[locale] || defaultValue;
  } catch {
    return defaultValue;
  }
}

interface SeoVideosListProps {
  locale: string;
}

export default async function SeoVideosList({ locale }: SeoVideosListProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "seo.videos",
  });

  // Fetch videos directly from database for SEO
  const allVideos = await db
    .select()
    .from(videos)
    .where(eq(videos.processed, true))
    .orderBy(desc(videos.createdAt));

  const localizedVideos = (allVideos as Video[]).map((video) => ({
    ...video,
    title: getLocalizedField(video.title, video.titleTranslation, locale),
    description: getLocalizedField(video.description, video.descriptionTranslation, locale),
    summary: getLocalizedField(video.summary, video.summaryTranslation, locale),
    bite: getLocalizedField(video.bite, video.biteTranslation, locale),
  }));

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return "";
  };

  return (
    <div className="prose dark:prose-invert pb-16 lg:max-w-none lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      <p className="text-muted-foreground max-w-3xl">
        {t("description")}
      </p>

      <div className="not-prose grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {localizedVideos.map((video) => {
          const videoSlug = generateVideoSlug(video.id, video.title ?? "");
          return (
            <Link
              href={`/videos/${videoSlug}`}
              key={video.id}
              className="group block"
            >
              <div className="flex h-full flex-col rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="relative mb-3">
                  <img
                    src={`https://img.youtube.com/vi/${getYouTubeVideoId(video.url)}/mqdefault.jpg`}
                    alt={`${t("thumbnailAlt")} ${video.title ?? ""}`}
                    className="h-48 w-full rounded object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-opacity-50 group-hover:bg-opacity-80 flex h-16 w-16 items-center justify-center rounded-full bg-black/50 transition-all">
                      <svg
                        className="ml-1 h-8 w-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col">
                  <h2 className="mb-2 text-base font-medium text-blue-600 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300">
                    {video.title}
                  </h2>
                  <h3>
                    {/* Video Summary */}
                    {video.bite && (
                      <div className="mb-3 flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {video.bite}
                        </p>
                      </div>
                    )}
                  </h3>

                  <p className="mt-auto text-sm font-light text-gray-500 dark:text-gray-400">
                    {t("by")} <b>{video.author}</b> (
                    {video.sex === "f" ? t("female") : t("male")})
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
