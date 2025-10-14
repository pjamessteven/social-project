"use server";

import { markdownToPlainText } from "@/app/lib/utils";
import { ExternalLink } from "lucide-react";
import { marked } from "marked";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import UserComments from "../../components/UserComments";

interface User {
  commentCount: string;
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  experience: string | null;
  redFlagsReport: string | null;
  tags: string[];
  transitionAge: number | null;
  detransitionAge: number | null;
}

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username?: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await getUser(username!);
  return {
    title: "Reddit user /u/" + username + "'s Detransition Story | detrans.ai",
    description: markdownToPlainText(user?.experienceSummary?.slice(0, 300)),
    openGraph: {
      title: username + "'s Detransition Story | detrans.ai",
      description: markdownToPlainText(user?.experienceSummary?.slice(0, 300)),
      images: ["https://detrans.ai/x_card_lg.png"],
    },
  };
}

async function getUser(username: string): Promise<User | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/users/${encodeURIComponent(username)}`,
      { cache: "no-store" },
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const url = `${baseUrl}/api/users/${encodeURIComponent(username)}/comments?limit=10`;

    console.log("Fetching comments from:", url);

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Comments data:", data);
      return data.comments || [];
    } else {
      console.error(
        "Failed to fetch comments:",
        response.status,
        response.statusText,
      );
      return [];
    }
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

  return (
    <div className="container mx-auto px-0 pb-8">
      <Link href="/stories">
        <Button variant="link" className="mb-6 -ml-4">
          {"<- "}
          All Stories
        </Button>
      </Link>

      <div className="prose dark:prose-invert space-y-6 max-w-full">
        {/* Header */}
        <div>
          <div className="mb-6 flex flex-col items-baseline justify-between sm:mb-4 sm:flex-row">
            <div className="mb-4 flex flex-col sm:mb-0">
              <h1 className="mb-2 !text-2xl font-bold sm:mb-2">
                Reddit user{" "}
                <span className="whitespace-nowrap">/u/{user.username}'s</span>{" "}
                Detransition Story
              </h1>
              {(user.transitionAge || user.detransitionAge) && (
                <div className="text-muted-foreground">
                  {user.transitionAge && "Transitioned: " + user.transitionAge}
                  {user.transitionAge && user.detransitionAge && " -> "}
                  {user.detransitionAge &&
                    "Detransitioned: " + user.detransitionAge}
                </div>
              )}
            </div>
            <Link
              href={`https://reddit.com/u/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="default" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Reddit Profile
              </Button>
            </Link>
          </div>

          {user.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="inverted">
                {user.sex === "f" ? "female" : "male"}
              </Badge>

              {user.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant={
                    tag === "suspicious account" ? "destructive" : "inverted"
                  }
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <details className="mb-4 cursor-pointer">
          <summary className="text-muted-foreground">
            <i>
              This story is from the comments listed
              below, summarised by AI.
            </i>
          </summary>
          <div className="mt-2 mb-8 rounded-lg border p-3 text-sm text-gray-600 sm:text-base dark:text-gray-400">
            On Reddit, people often share their experiences across multiple
            comments or posts. To make this information more accessible, our AI
            gathers all of those scattered pieces into a single, easy-to-read
            summary and timeline. All system prompts are noted on the prompts
            page.
            <p />
            Sometimes AI can hallucinate or state things that are not true. But
            generally, the summarised stories are accurate reflections of the
            original comments by users.
          </div>
        </details>
        {/* Red Flags Report */}
        {user.redFlagsReport && (
          <details className="cursor-pointer">
            <summary className="text-muted-foreground">
              <i>
                Authenticity Assessment:{" "}
                {user.tags.includes("suspicious account")
                  ? "Suspicious Account"
                  : "Not Suspicious"}
              </i>
            </summary>
            <div
              dangerouslySetInnerHTML={{
                __html: marked.parse(user.redFlagsReport || ""),
              }}
              className="mt-2 mb-8 rounded-lg border p-3 text-sm text-gray-600 sm:text-base dark:text-gray-400"
            ></div>
          </details>
        )}

        {/* Experience Summary */}
        {user.experienceSummary && (
          <div>
            <h3 className="mb-2 font-semibold">About me</h3>
            <p className="border-t pt-4 leading-relaxed">
              {user.experienceSummary}
            </p>
          </div>
        )}

        {/* Full Experience */}
        {user.experience && (
          <div className="">
            <h3 className="mb-2 font-semibold">My detransition story</h3>

            <div className="border-t">
              <div
                className="prose-table mt-4 max-w-none"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(user.experience || ""),
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Top Comments */}

        <UserComments
          username={user.username}
          initialComments={comments}
          commentCount={Number(user.commentCount)}
          activeSince={formatDate(user.activeSince)}
        />
      </div>
    </div>
  );
}
