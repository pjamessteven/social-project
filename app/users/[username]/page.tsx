import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import { marked } from "marked";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

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

async function getUser(username: string): Promise<User | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/users/${encodeURIComponent(username)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

async function getUserComments(username: string): Promise<Comment[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/users/${encodeURIComponent(username)}/comments?limit=10`,
      { cache: 'no-store' }
    );

    if (response.ok) {
      const data = await response.json();
      return data.comments;
    }
    return [];
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [user, comments] = await Promise.all([
    getUser(username),
    getUserComments(username),
  ]);

  if (!user) {
    notFound();
  }

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
                      __html: marked.parse(user.redFlagsReport || ''),
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
                  __html: marked.parse(user.experience || ''),
                }}
              ></div>
            </div>
          </div>
        )}


        {/* Top Comments */}
        <div>
          <h3 className="mb-4 font-semibold">Top Comments</h3>
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
                    className="prose dark:prose-invert max-w-none text-sm mt-4"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(comment.text || ''),
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
