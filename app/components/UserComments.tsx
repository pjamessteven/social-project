"use client";

import { useState } from "react";
import { marked } from "marked";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface Comment {
  id: string;
  text: string;
  score: number;
  created: string;
  link: string;
  subreddit: string;
}

interface UserCommentsProps {
  username: string;
  initialComments: Comment[];
}

export default function UserComments({ username, initialComments }: UserCommentsProps) {
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

  const loadMoreComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(username)}/comments?offset=${comments.length}&limit=10`
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
        <p className="text-gray-500 dark:text-gray-400">
          No comments found.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border bg-white p-4 dark:bg-gray-900"
            >
              <div className="mb-2 flex items-start justify-between">
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
              <div
                className="prose dark:prose-invert mt-4 max-w-none text-sm"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(comment.text || ""),
                }}
              />
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
