"use server";

import {
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
  parseVideoIdFromSlug,
} from "@/app/lib/video-utils";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface VideoPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: VideoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const videoId = parseVideoIdFromSlug(slug);

  if (!videoId) {
    return {
      title: "Video Not Found | detrans.ai",
      description: "The requested video could not be found.",
    };
  }

  const video = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!video) {
    return {
      title: "Video Not Found | detrans.ai",
      description: "The requested video could not be found.",
    };
  }

  const youtubeVideoId = getYouTubeVideoId(video.url);
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;

  return {
    title: `${video.title} | detrans.ai`,
    description:
      video.description ||
      `Watch ${video.title} by ${video.author}, a ${video.sex === "f" ? "female" : "male"} detransitioner sharing their story.`,
    openGraph: {
      title: `${video.title} | detrans.ai`,
      description:
        video.description ||
        `Watch ${video.title} by ${video.author}, a ${video.sex === "f" ? "female" : "male"} detransitioner sharing their story.`,
      url: `https://detrans.ai/videos/${slug}`,
      siteName: "detrans.ai",
      images: [
        {
          url: thumbnailUrl,
          width: 1280,
          height: 720,
          alt: `Thumbnail for ${video.title}`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${video.title} | detrans.ai`,
      description:
        video.description ||
        `Watch ${video.title} by ${video.author}, a ${video.sex === "f" ? "female" : "male"} detransitioner sharing their story.`,
      images: [thumbnailUrl],
    },
  };
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { slug } = await params;
  const videoId = parseVideoIdFromSlug(slug);

  if (!videoId) {
    notFound();
  }

  const video = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!video) {
    notFound();
  }

  const youtubeVideoId = getYouTubeVideoId(video.url);
  const embedUrl = getYouTubeEmbedUrl(youtubeVideoId);

  return (
    <div className="prose dark:prose-invert pb-16 lg:max-w-none lg:pt-8">
      <div className="mb-8">
        <a
          href="/videos"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          &larr; Back to all detransition videos
        </a>
      </div>

      <h1 className="mb-0 text-3xl font-bold">{video.title}</h1>
      {video.bite && (
        <h3 className="text-muted-foreground text-lg lg:text-xl">
          {video.bite}
        </h3>
      )}
      {/* YouTube Embed */}
      <div className="mt-8">
        <div className="relative h-0 overflow-hidden rounded-lg pb-[56.25%]">
          <iframe
            src={embedUrl}
            title={video.title}
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
          {video.summary && (
            <div>
              <h3 className="mb-2 font-semibold">Overview</h3>
              <p className="border-t pt-4 leading-relaxed">{video.summary}</p>
            </div>
          )}
          {/* Description */}
          {video.description && (
            <div>
              <h3 className="mb-2 font-semibold">Full Video Summary</h3>
              <p className="border-t pt-4 leading-relaxed whitespace-break-spaces">
                {video.description}
              </p>
              <div className="mt-4">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Watch on YouTube →
                </a>
              </div>
            </div>
          )}
          <div></div>
        </div>
      </div>

      {/* Related Videos Section (placeholder for future implementation) */}
      <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
        <h2 className="mb-6 text-2xl font-bold">More Videos</h2>
        <p className="text-gray-600 dark:text-gray-400">
          <a
            href="/videos"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Browse all detransition videos →
          </a>
        </p>
      </div>
    </div>
  );
}
