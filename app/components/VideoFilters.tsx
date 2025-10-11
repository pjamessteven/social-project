"use client";

import { useState } from "react";

interface Video {
  id: string;
  title: string;
  author: string;
  type: "MTFTM" | "FTMTF";
  url: string;
}

interface VideoFiltersProps {
  videos: Video[];
}

export default function VideoFilters({ videos }: VideoFiltersProps) {
  const [filter, setFilter] = useState<"all" | "FTMTF" | "MTFTM">("all");

  const filteredVideos = videos.filter((video) => {
    if (filter === "all") return true;
    return video.type === filter;
  });

  return (
    <>
      <div className="not-prose mt-8 mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            All Stories
          </button>
          <button
            onClick={() => setFilter("FTMTF")}
            className={`rounded px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              filter === "FTMTF"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Female Stories
          </button>
          <button
            onClick={() => setFilter("MTFTM")}
            className={`rounded px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              filter === "MTFTM"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Male Stories
          </button>
        </div>
      </div>

      <div className="not-prose grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredVideos.map((video) => (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            key={video.id}
            className="group block"
          >
            <div className="flex h-full flex-col rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
              <div className="relative mb-3">
                <img
                  src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
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
                <p className="mt-auto text-sm font-light text-gray-500 dark:text-gray-400">
                  by <b>{video.author}</b> (
                  {video.type === "FTMTF" ? "Female" : "Male"})
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
