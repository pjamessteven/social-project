"use client";

import { slugify } from "@/app/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Question {
  id: string;
  text: string;
  topic_id: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface TopicResponse {
  items: Question[];
  pagination: PaginationInfo;
}

interface TopicInfo {
  topic_id: number;
  name: string;
  label: string;
  keywords: string[];
  keyword_name: string;
  questionCount: number;
  isSynthetic: boolean;
}

interface SavedPageState {
  questions: Question[];
  pagination: PaginationInfo | null;
  topicInfo: TopicInfo | null;
  currentPage: number;
  hasMore: boolean;
}

export default function TopicPage({ params }: { params: { id: string } }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [topicInfo, setTopicInfo] = useState<TopicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const topicId = params.id;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [isRestoringState, setIsRestoringState] = useState(false);

  // Generate storage key for this topic
  const storageKey = `topic-${topicId}-state`;

  // Save state to localStorage
  const saveState = useCallback(() => {
    if (typeof window !== 'undefined') {
      const state: SavedPageState = {
        questions,
        pagination,
        topicInfo,
        currentPage,
        hasMore,
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [questions, pagination, topicInfo, currentPage, hasMore, storageKey]);

  // Load state from localStorage
  const loadState = useCallback((): SavedPageState | null => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : null;
      } catch (err) {
        console.error('Error loading saved state:', err);
        return null;
      }
    }
    return null;
  }, [storageKey]);

  const fetchTopicInfo = async () => {
    try {
      const response = await fetch(`/api/questions/topic/${topicId}/name`);

      if (!response.ok) {
        throw new Error(`Failed to fetch topic info: ${response.statusText}`);
      }

      const data: TopicInfo = await response.json();
      setTopicInfo(data);
    } catch (err) {
      console.error("Error fetching topic info:", err);
    }
  };

  const fetchQuestions = async (page: number, append = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await fetch(
        `/api/questions/topic/${topicId}?page=${page}&limit=20`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`);
      }

      const data: TopicResponse = await response.json();

      if (append) {
        setQuestions((prev) => [...prev, ...data.items]);
      } else {
        setQuestions(data.items);
      }

      setPagination(data.pagination);
      setHasMore(data.pagination.hasNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && pagination) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchQuestions(nextPage, true);
    }
  }, [loadingMore, hasMore, pagination, currentPage]);

  // Save state whenever it changes
  useEffect(() => {
    if (!isRestoringState && questions.length > 0) {
      saveState();
    }
  }, [questions, pagination, topicInfo, currentPage, hasMore, saveState, isRestoringState]);

  // Initial load - check for saved state first
  useEffect(() => {
    const savedState = loadState();
    
    if (savedState && savedState.questions.length > 0) {
      // Restore saved state
      setIsRestoringState(true);
      setQuestions(savedState.questions);
      setPagination(savedState.pagination);
      setTopicInfo(savedState.topicInfo);
      setCurrentPage(savedState.currentPage);
      setHasMore(savedState.hasMore);
      setLoading(false);
      
      // Mark restoration as complete
      setTimeout(() => {
        setIsRestoringState(false);
      }, 100);
    } else {
      // No saved state, fetch fresh data
      fetchTopicInfo();
      fetchQuestions(1);
    }
  }, [topicId, loadState]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    observerRef.current = observer;

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);

  const getHref = (question: string) => {
    const slug = slugify(question);
    return "/chat/" + slug;
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 dark:text-red-400">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-primary text-3xl font-bold">
          {topicInfo ? `Topic: ${topicInfo.name}` : `Topic ${topicId}`}
        </h1>
        {topicInfo && (
          <div className="mt-4 space-y-1">
            {topicInfo.keywords && topicInfo.keywords.length > 0 && (
              <p className="text-muted-foreground">
                Keywords: {topicInfo.keywords.join(", ")}
              </p>
            )}
          </div>
        )}
        {pagination && (
          <p className="text-muted-foreground mt-2">
            {pagination.total} questions found in the vector database.
          </p>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="text-muted-foreground text-center">
          <p>No questions found for this topic.</p>
        </div>
      ) : (
        <>
          <div className="mb-8 space-y-3">
            {questions.map((question, index) => {
              // Calculate question number based on position in the full list
              const questionNumber = index + 1;
              
              return (
                <Link
                  key={question.id}
                  href={getHref(question.text)}
                  prefetch={false}
                  className="block"
                >
                  <div className="rounded-lg border-b pb-3 transition-colors">
                    <div className="flex items-start">
                      <div className="text-muted-foreground mr-3">{"->"}</div>
                      <div className="flex-1">
                        <p className="text-foreground hover:text-primary text-lg transition-colors hover:underline">
                          {question.text}{" "}
                          <span className="text-muted-foreground text-sm">
                            (#{questionNumber})
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {loadingMore && (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-muted-foreground">
                  Loading more questions...
                </span>
              </div>
            )}
            {!hasMore && questions.length > 0 && (
              <p className="text-muted-foreground">
                No more questions to load.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
