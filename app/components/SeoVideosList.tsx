"use server";

import { VideoCard } from "@/app/components/content/VideoCard";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import { generateVideoSlug, spreadByAuthor } from "@/app/lib/video-utils";
import { db } from "@/db";
import { videos } from "@/db/schema";
import type { Locale } from "@/i18n/routing";
import { desc, eq, sql } from "drizzle-orm";
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
}

interface SeoVideosListProps {
  locale: string;
}

export default async function SeoVideosList({ locale }: SeoVideosListProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "seo.videos",
  });

  // Fetch videos directly from database for SEO with locale-specific fields only
  const localizedVideos = await db
    .select({
      id: videos.id,
      title: sql<string>`COALESCE((${videos.titleTranslation})::jsonb->>${locale}, ${videos.title})`,
      englishTitle: videos.title,
      author: videos.author,
      sex: videos.sex,
      url: videos.url,
      type: videos.type,
      description: sql<
        string | null
      >`COALESCE((${videos.descriptionTranslation})::jsonb->>${locale}, ${videos.description})`,
      summary: sql<
        string | null
      >`COALESCE((${videos.summaryTranslation})::jsonb->>${locale}, ${videos.summary})`,
      bite: sql<
        string | null
      >`COALESCE((${videos.biteTranslation})::jsonb->>${locale}, ${videos.bite})`,
    })
    .from(videos)
    .where(eq(videos.processed, true))
    .orderBy(desc(videos.createdAt));

  return (
    <div className="prose dark:prose-invert pb-16 lg:max-w-none lg:pt-8">
      <h1 className={PAGE_TITLE}>{t("title")}</h1>

      <p className="text-muted-foreground max-w-3xl">{t("description")}</p>

      <div className="not-prose grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {spreadByAuthor(localizedVideos).map((video) => {
          const videoSlug = generateVideoSlug(video.id, video.englishTitle);
          return (
            <VideoCard
              key={video.id}
              href={`/videos/${videoSlug}`}
              videoUrl={video.url}
              title={video.title ?? ""}
              thumbnailAlt={`${t("thumbnailAlt")} ${video.title ?? ""}`}
              summary={video.bite}
              titleAs="h2"
              byline={
                <>
                  {t("by")}{" "}
                  <span className="text-foreground">{video.author}</span> (
                  {video.sex === "f" ? t("female") : t("male")})
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
