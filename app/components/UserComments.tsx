"use client";

import { marked } from "marked";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface Comment {
  id: string;
  text: string;
  score: number;
  created: string;
  link: string;
  subreddit: string;
  questions: string | null;
  summary: string;
}

interface UserCommentsProps {
  username: string;
  initialComments: Comment[];
}

export default function UserComments({
  username,
  initialComments,
}: UserCommentsProps) {
  console.log("UserComments received:", { username, initialComments });
  
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialComments.length === 10); // Assume more if we got a full page

  const formatCommentDate = (utcDate: string) => {
    return new Date(utcDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const parseQuestions = (questionsText: string | null): string[] => {
    if (!questionsText) return [];

    // Remove "QUESTIONS: " prefix if it exists
    const cleanText = questionsText.replace(/^QUESTIONS:\s*/, "");

    // Split by question marks and filter out empty strings
    const questions = cleanText
      .split("?")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .map((q) => {
        // Remove leading numbers (e.g., "5. " or "10. ")
        const withoutNumber = q.replace(/^\d+\.\s*/, "");
        return withoutNumber + "?";
      });

    return questions;
  };

  const loadMoreComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(username)}/comments?offset=${comments.length}&limit=10`,
      );

      if (response.ok) {
        const data = await response.json();
        const newComments = data.comments || [];
        setComments([...comments, ...newComments]);
        setHasMore(newComments.length === 10); // If we got less than 10, no more to load
      }
    } catch (error) {
      console.error("Error loading more comments:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="mb-4 font-semibold">Top Comments by /u/{username}:</h3>
      {comments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No comments found.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border bg-white dark:bg-gray-900"
            >
              <div className="bg-secondary flex flex-col">
                <div className="mb-2 flex items-start justify-between border-b  p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Badge variant="inverted">
                      <span className="whitespace-nowrap">
                        {comment.score} points
                      </span>
                    </Badge>
                    <span className="hidden sm:inline">r/detrans</span>
                    <span>{formatCommentDate(comment.created)}</span>
                  </div>
                  <Link
                    href={`https://reddit.com${comment.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View on Reddit
                  </Link>
                </div>
                <div className=" prose font-semibold  px-4 pb-2 text-sm dark:prose-invert">
                {comment.summary}
                </div>
              </div>
              <div
                className="prose px-4 dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(comment.text || ""),
                }}
              />

              {comment.questions && false && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Questions:
                  </h4>
                  <ul className="space-y-1">
                    {parseQuestions(comment.questions).map(
                      (question, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 dark:text-gray-400"
                        >
                          • {question}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={loadMoreComments}
                disabled={loading}
                variant="outline"
              >
                {loading ? "Loading..." : "Load More Comments"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
