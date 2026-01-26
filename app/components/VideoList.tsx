"use client";

import { generateVideoSlug } from "@/app/lib/video-utils";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface Video {
  id: number;
  title: string;
  author: string;
  sex: "m" | "f";
  url: string;
  type: string;
  description: string | null;
  summary: string | null;
}

export default function VideoList() {
  const [filter, setFilter] = useState<"all" | "f" | "m">("all");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch("/api/videos");
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
  }, []);

  const filteredVideos = videos.filter((video) => {
    if (filter === "all") return true;
    return video.sex === filter;
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

  if (loading) {
    return <div className="py-8 text-center">Loading videos...</div>;
  }

  return (
    <>
      <div className="flex flex-col border-t">
        <div className="not-prose mt-4 mb-4 overflow-x-auto">
          <Tabs
            value={filter}
            onValueChange={(value: string) =>
              setFilter(value as "all" | "f" | "m")
            }
            className="w-full"
          >
            <TabsList className="grid h-12 grid-cols-3 gap-8 rounded-2xl border">
              <TabsTrigger
                value="all"
                className="flex-row items-center gap-2 rounded-xl py-2"
              >
                <span className="text-sm font-medium">All Stories</span>
              </TabsTrigger>
              <TabsTrigger
                value="f"
                className="flex-row items-center gap-2 rounded-lg py-2"
              >
                <span className="text-sm font-medium">
                  Female
                  <span className="hidden sm:inline">
                    &nbsp;Detransitioners
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="m"
                className="flex-row items-center gap-2 rounded-lg py-2"
              >
                <span className="text-sm font-medium">
                  Male
                  <span className="hidden sm:inline">
                    &nbsp;Detransitioners
                  </span>
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="not-prose grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => {
            const videoSlug = generateVideoSlug(video.id, video.title);
            return (
              <a
                href={`/videos/${videoSlug}`}
                key={video.id}
                className="group block"
              >
                <div className="hover-group dark:bg-secondary block h-full rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:bg-gray-100">
                  <div className="relative mb-3">
                    <img
                      src={`https://img.youtube.com/vi/${getYouTubeVideoId(video.url)}/mqdefault.jpg`}
                      alt={`Thumbnail for ${video.title}`}
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
                    <h3 className="mb-2 text-base font-medium text-blue-600 group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300">
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
                      by <b>{video.author}</b> (
                      {video.sex === "f" ? "Female" : "Male"})
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}
