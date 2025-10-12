import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { markdownToPlainText } from "@/app/lib/utils";
import { Check, ExternalLink, Info, ShieldQuestion } from "lucide-react";
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
      images: ["https://detrans.ai/x_lg.png"],
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
          Back to Users
        </Button>
      </Link>

      <div className="sm:prose-base dark:prose-invert space-y-6">
        {/* Header */}
        <div>
          <div className="mb-6 flex flex-col items-baseline justify-between sm:mb-8 sm:flex-row">
            <div className="mb-4 flex flex-col sm:mb-0">
              <h1 className="mb-2 !text-2xl font-bold sm:mb-2">
                Reddit user{" "}
                <span className="whitespace-nowrap">/u/{user.username}'s</span>{" "}
                Detransition Story
              </h1>
              {(user.transitionAge || user.detransitionAge) && (
                <div className="text-gray-500">
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
            <div className="mb-6 flex flex-wrap gap-2">
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

        <Accordion type="single" collapsible className="not-prose mt-8 w-full">
          <AccordionItem
            value="disclaimer"
            className="overflow-hidden dark:bg-none"
          >
            <AccordionTrigger className="text-muted-foreground mb-2 py-1 pr-3 text-xs hover:no-underline sm:text-sm">
              <div className="flex items-center">
                <Info className="mr-2 h-4 min-w-4" />
                <div>
                  This detransition story is from all of this users comments on
                  Reddit, summarised by our AI.
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-secondary-foreground px-0 pb-3 text-sm">
              <div className="max-w-2xl space-y-3">
                <p>
                  On Reddit, people often share their experiences across
                  multiple comments or posts. To make this information more
                  accessible, our AI gathers all of those scattered pieces into
                  a single, easy-to-read summary and timeline. All system
                  prompts are noted on the prompts page.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Red Flags Report */}
        {user.redFlagsReport && (
          <Accordion
            type="single"
            collapsible
            className="not-prose -mt-4 w-full pt-0"
          >
            <AccordionItem
              value="disclaimer"
              className={`overflow-hidden dark:bg-none border-none`}
            >
              <AccordionTrigger className="text-muted-foreground py-1 pr-3 text-xs hover:no-underline sm:text-sm">
                <div className="flex items-center justify-start">
                  {user.tags.includes("suspicious account") ? <ShieldQuestion className="mr-2 h-4 min-w-4"/> : <Check className="mr-2 h-4 min-w-4" />}
                  <div>
                    Authenticity Assessment:{" "}
                    {user.tags.includes("suspicious account")
                      ? "Suspicious Account"
                      : "Not suspicious"}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pt-3 pb-3">
                <div className="max-w-2xl">
                  <p
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(user.redFlagsReport || ""),
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
