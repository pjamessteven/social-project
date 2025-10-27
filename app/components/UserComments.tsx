"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import CommentCard from "./CommentCard";

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
  activeSince: string;
  commentCount: number;
}

export default function UserComments({
  username,
  initialComments,
  activeSince,
  commentCount,
}: UserCommentsProps) {
  console.log("UserComments received:", { username, initialComments });

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialComments.length === 10); // Assume more if we got a full page


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
      <h3 className="text-lg mb-4 sm:mt-16 font-semibold">
        Top Comments by /u/{username}:
      </h3>
      <div className="mb-6 -mt-2 text-sm text-gray-600 dark:text-gray-400">
        {commentCount} comments • Posting since {activeSince}
        {}{" "}
      </div>
      {comments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No comments found.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
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
