"use client";

import { slugify } from "@/app/lib/utils";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function TopicPage({ params }: { params: { id: string } }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [topicInfo, setTopicInfo] = useState<TopicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const topicId = params.id;

  const fetchTopicInfo = async () => {
    try {
      const response = await fetch(`/api/questions/topic/${topicId}/name`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch topic info: ${response.statusText}`);
      }
      
      const data: TopicInfo = await response.json();
      setTopicInfo(data);
    } catch (err) {
      console.error('Error fetching topic info:', err);
    }
  };

  const fetchQuestions = async (page: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/questions/topic/${topicId}?page=${page}&limit=20`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`);
      }
      
      const data: TopicResponse = await response.json();
      setQuestions(data.items);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicInfo();
    fetchQuestions(currentPage);
  }, [topicId, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getHref = (question: string) => {
    const slug = slugify(question);
    return "/chat/" + slug;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
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
        <h1 className="text-3xl font-bold text-primary">
          {topicInfo ? topicInfo.name : `Topic ${topicId}`}
        </h1>
        {topicInfo && (
          <div className="mt-2 space-y-1">
            <p className="text-muted-foreground">
              {topicInfo.label}
            </p>
            {topicInfo.keywords && topicInfo.keywords.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Keywords: {topicInfo.keywords.join(', ')}
              </p>
            )}
          </div>
        )}
        {pagination && (
          <p className="text-muted-foreground mt-2">
            {pagination.total} questions found
          </p>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="text-center text-muted-foreground">
          <p>No questions found for this topic.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {questions.map((question) => (
              <Link
                key={question.id}
                href={getHref(question.text)}
                prefetch={false}
                className="block"
              >
                <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start">
                    <div className="mr-3 text-muted-foreground">→</div>
                    <div className="flex-1">
                      <p className="text-lg text-foreground hover:text-primary transition-colors">
                        {question.text}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ID: {question.id}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNext}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
