"use client";

import { slugify } from "@/app/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const timestamp = new Date(dateString).getTime();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
}

interface TopQuestion {
  page: string;
  score?: number;
  mostRecentlyAsked?: string;
}

interface TopQuestionsResponse {
  items: TopQuestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function DynamicQuestionCategories({
  mode,
  questionMode = "top",
}: {
  mode: "affirm" | "detrans" | "compare";
  questionMode?: "top" | "recent";
}) {
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopQuestions = async (page: number, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(
        `/api/questions/${questionMode}?mode=${mode}&page=${page}&limit=20`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${questionMode} questions`);
      }

      const data: TopQuestionsResponse = await response.json();

      if (append) {
        setTopQuestions((prev) => [...prev, ...data.items]);
      } else {
        setTopQuestions(data.items);
      }

      setHasMore(data.pagination.hasNext);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTopQuestions(1);
  }, [mode, questionMode]);

  const handleShowMore = () => {
    fetchTopQuestions(currentPage + 1, true);
  };

  const getQuestionUrl = (question: string) => {
    const slug = slugify(question);
    switch (mode) {
      case "affirm":
        return `/affirm/research/${slug}`;
      case "compare":
        return `/compare/research/${slug}`;
      default:
        return `/research/${slug}`;
    }
  };

  if (loading) {
    return (
      <div className="mb-8 min-h-[80vh]">
        <h3 className="text-primary mb-2 text-2xl font-bold">
          {questionMode === "top" ? "Top Questions" : "Recent Questions"}
        </h3>
        <p className="text-muted-foreground mb-6 text-sm">
          {questionMode === "top"
            ? "These are the top questions people have asked detrans.ai"
            : "These are the most recent questions people have asked detrans.ai"}
        </p>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading {questionMode} questions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 min-h-[80vh]">
        <h3 className="text-primary mb-2 text-2xl font-bold">
          {questionMode === "top" ? "Top Questions" : "Recent Questions"}
        </h3>
        <p className="text-muted-foreground mb-6 text-sm sm:text-base">
          {questionMode === "top"
            ? "These are the top questions people have asked detrans.ai"
            : "These are the most recent questions people have asked detrans.ai"}
        </p>
        <div className="py-4 text-red-500">
          Error loading questions: {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 min-h-[80vh]">
        <h3 className="text-primary mb-2 text-2xl font-bold">
          {" "}
          {questionMode === "top" ? "Top Questions" : "Recent Questions"}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm sm:mb-6">
          {questionMode === "top"
            ? "These are the top questions people have asked detrans.ai"
            : "These are the most recent questions people have asked detrans.ai"}
        </p>
        <div className="grid gap-1 ">
          {topQuestions.map((item, index) => (
            <Link
              prefetch={false}
              href={getQuestionUrl(item.page)}
              key={`${item.page}-${index}`}
            >
              <div className="flex flex-row items-center border-b pt-1 pb-2">
                <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-center text-base sm:text-lg italic opacity-90">
                  <div className="mr-2 whitespace-nowrap">{"->"}</div>
                  <div className="flex-1">{item.page}</div>
                  <div className="ml-2 text-xs sm:text-sm font-normal opacity-60">
                    {questionMode === "recent" && item.mostRecentlyAsked
                      ? `(${formatRelativeTime(item.mostRecentlyAsked)})`
                      : `(${item.score} views)`}
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {hasMore && (
            <div
              className="flex cursor-pointer flex-row items-center border-b pt-1 pb-2"
              onClick={handleShowMore}
            >
              <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-lg italic opacity-90">
                <div className="mr-2 whitespace-nowrap"> </div>
                <div className="ml-5 flex-1">
                  {loadingMore ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading more results...
                    </span>
                  ) : (
                    <span className="flex items-center">Load more results</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
