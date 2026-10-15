"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { VideoCard } from "./content/VideoCard";
import { CARD_SURFACE } from "./ui/card-styles";
import { SearchBar } from "./ui/search-bar";
import { SlidingNavGroup } from "./ui/sliding-nav-group";

interface Video {
  id: number;
  title: string;
  slug: string;
  author: string;
  sex: "m" | "f";
  url: string;
  type: string;
  description: string | null;
  summary: string | null;
  bite: string | null;
  titleTranslation?: string | null;
}

export default function VideosList() {
  const t = useTranslations("videoList");
  const locale = useLocale();
  const [filter, setFilter] = useState<"all" | "f" | "m">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch(`/api/videos?locale=${locale}`);
        if (response.ok) {
          const data = await response.json();
          setVideos(data.videos || []);
        }
      } catch (error) {
        console.error("Failed to fetch videos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, [locale]);

  const filteredVideos = videos.filter((video) => {
    const matchesFilter = filter === "all" || video.sex === filter;
    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const searchText = (
      video.title +
      " " +
      video.author +
      " " +
      (video.summary || "") +
      " " +
      (video.description || "")
    ).toLowerCase();
    return searchText.includes(query);
  });

  const tabs = [
    {
      key: "all",
      label: t("filters.all"),
      isActive: filter === "all",
    },
    {
      key: "f",
      label: <>{t("filters.female")}</>,
      isActive: filter === "f",
    },
    {
      key: "m",
      label: <>{t("filters.male")}</>,
      isActive: filter === "m",
    },
  ];

  return (
    <>
      <div className="flex flex-col items-stretch">
        {/* Search + Filters Bar */}
        <div className="not-prose mt-4 flex flex-col gap-3 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("searchPlaceholder")}
            className="w-full sm:grow"
          />
          <SlidingNavGroup
            tabs={tabs}
            className="bg-secondary/50 dark:bg-secondary/30 flex border"
            onTabClick={(key) => setFilter(key as "all" | "f" | "m")}
            tabClassName="w-full sm:w-40 flex just-center justify-center"
          />
        </div>

        {/* Results count */}
        {!loading && (
          <div className="text-muted-foreground not-prose mb-4 text-sm">
            {filteredVideos.length}{" "}
            {filteredVideos.length === 1 ? t("result") : t("results")}
          </div>
        )}

        {loading ? (
          <div className="not-prose grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`flex h-full flex-col overflow-hidden ${CARD_SURFACE}`}
              >
                <div className="aspect-video w-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mb-3 flex-1 space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-4/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="mt-auto h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="not-prose grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => {
              const videoSlug = video.slug;
              return (
                <VideoCard
                  key={video.id}
                  href={`/videos/${videoSlug}`}
                  videoUrl={video.url}
                  title={video.title}
                  thumbnailAlt={t("thumbnailAlt", { title: video.title })}
                  summary={video.summary}
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
        )}
      </div>
    </>
  );
}
