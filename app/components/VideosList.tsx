"use client";

import { generateVideoSlug } from "@/app/lib/video-utils";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { SearchBar } from "./ui/search-bar";
import { SlidingNavGroup } from "./ui/sliding-nav-group";

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
          <div className="not-prose grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="dark:bg-secondary flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="relative mb-3">
                  <div className="h-48 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="flex flex-1 flex-col">
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
          <div className="not-prose grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => {
              const videoSlug = generateVideoSlug(video.id, video.title);
              return (
                <Link
                  href={`/videos/${videoSlug}` as any}
                  key={video.id}
                  className="group block"
                >
                  <div className="hover-group dark:bg-secondary block h-full rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:bg-gray-100">
                    <div className="relative mb-3">
                      <img
                        src={`https://img.youtube.com/vi/${getYouTubeVideoId(video.url)}/mqdefault.jpg`}
                        alt={t("thumbnailAlt", { title: video.title })}
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
                      <h3 className="mb-2 line-clamp-2 text-base font-medium text-blue-600 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300">
                        {video.title}
                      </h3>

                      {/* Video Description */}
                      {video.summary && (
                        <div className="mb-3 flex-1">
                          <p className="line-clamp-5 text-sm text-gray-600 dark:text-gray-300">
                            {video.summary}
                          </p>
                        </div>
                      )}

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
        )}
      </div>
    </>
  );
}
