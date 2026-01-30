"use client";

import { ExternalLink } from "lucide-react";
import { marked } from "marked";
import { Link } from "@/i18n/routing";

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

interface CommentCardProps {
  comment: Comment;
}

export default function CommentCard({ comment }: CommentCardProps) {
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

  return (
    <div className="rounded-lg overflow-hidden border bg-white dark:bg-gray-900">
      <div className="bg-secondary dark:bg-primary/5 flex flex-col">
        <div className="prose dark:prose-invert max-w-full px-4 pt-3 pb-3  font-semibold">
          {comment.summary}
        </div>
        <div className="flex items-start justify-between px-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="whitespace-nowrap">
              {comment.score} points
            </span>
            •<span>{formatCommentDate(comment.created)}</span>
          </div>
          <Link
            href={`https://reddit.com${comment.link}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <div>View on Reddit</div>
            <ExternalLink className="ml- h-3" />
          </Link>
        </div>
      </div>
      <div
        className="prose dark:prose-invert max-w-none px-4 py-3 dark:text-muted-foreground "
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
  );
}
