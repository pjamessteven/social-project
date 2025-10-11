"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import { marked } from "marked";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";

interface User {
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  experience: string | null;
  redFlagsReport: string | null;
  tags: string[];
}

interface Comment {
  id: string;
  body: string;
  score: number;
  created_utc: string;
  permalink: string;
  subreddit: string;
}

export default function UserPage() {
  const params = useParams();
  const username = params.username as string;
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(username)}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("User not found");
          } else {
            setError("Failed to load user");
          }
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    const fetchComments = async () => {
      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(username)}/comments?limit=10`,
        );

        if (response.ok) {
          const data = await response.json();
          setComments(data.comments);
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setCommentsLoading(false);
      }
    };

    if (username) {
      fetchUser();
      fetchComments();
    }
  }, [username]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCommentDate = (utcDate: string) => {
    return new Date(utcDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-6">
          <div>
            <Skeleton className="mb-4 h-8 w-48" />
            <div className="mb-4 flex gap-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="mb-6 flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div>
            <Skeleton className="mb-4 h-6 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div>
            <Skeleton className="mb-4 h-6 w-40" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/users">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
        <div className="py-12 text-center">
          <h1 className="mb-4 text-2xl font-bold">
            {error || "User not found"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The user you're looking for doesn't exist or couldn't be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/users">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </Link>

      <div className="prose dark:prose-invert space-y-6">
        {/* Header */}
        <div>
          <h1 className="mb-4 text-3xl font-bold">{user.username}</h1>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {user.sex === "f" ? "Female" : "Male"}
              </Badge>
            </div>
            <div>Active in /r/detrans since {formatDate(user.activeSince)}</div>
          </div>

          {user.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {user.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

                {/* Red Flags Report */}
        {user.redFlagsReport && (
          <Accordion type="single" collapsible className="mt-8  pt-0 w-full ">
            <AccordionItem
              value="disclaimer"
              className={`overflow-hidden rounded-xl border opacity-80  ${
                user.tags.includes('suspicious account') 
                  ? 'border-destructive bg-destructive/5' 
                  : ''
              }`}
            >
              <AccordionTrigger className="px-3  py-0 -mt-4 not-prose ">
                Authenticity Assessment: {user.tags.includes('suspicious account') ? 'Suspicious Account' : 'Not suspicious'}
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3   prose-sm">
                <div className="max-w-2xl ">
                  <p
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(user.redFlagsReport),
                    }}
                  ></p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Experience Summary */}
        {user.experienceSummary && (
          <div>
            <h3 className="mb-4 font-semibold">Summary</h3>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">
              {user.experienceSummary}
            </p>
          </div>
        )}




        {/* Full Experience */}
        {user.experience && (
          <div>
            <h3 className="mb-4 font-semibold">Full Experience</h3>
            <div className="bg-white dark:bg-gray-900">
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(user.experience),
                }}
              ></div>
            </div>
          </div>
        )}


        {/* Top Comments */}
        <div>
          <h3 className="mb-4 font-semibold">Top Comments</h3>
          {commentsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <Skeleton className="mb-2 h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
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
                      <Badge variant="outline">{comment.score} points</Badge>
                      <span>r/detrans</span>
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
                    className="prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(comment.text),
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
