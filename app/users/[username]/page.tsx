import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { marked } from "marked";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import UserComments from "../../components/UserComments";

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
  text: string;
  score: number;
  created: string;
  link: string;
  subreddit: string;
  questions: string | null;
  summary: string;
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
        'Content-Type': 'application/json',
      }
    });

    console.log("Response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Comments data:", data);
      return data.comments || [];
    } else {
      console.error("Failed to fetch comments:", response.status, response.statusText);
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
      <Link href="/users">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 -ml-4 h-4 w-4" />
          Back to Users
        </Button>
      </Link>

      <div className="sm:prose-base prose-sm dark:prose-invert space-y-6">
        {/* Header */}
        <div>
          <div className="mb-6 flex sm:flex-row flex-col items-baseline justify-between">
            <div className="flex flex-col mb-4 sm:mb-0">
              <h1 className="mb-4 sm:mb-2 text-3xl font-bold">
                Reddit user /u/{user.username}
              </h1>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Active in /r/detrans since {formatDate(user.activeSince)}
              </div>
            </div>
            <Link
              href={`https://reddit.com/u/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Reddit
              </Button>
            </Link>
          </div>

          {user.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <Badge variant="primary">
                {user.sex === "f" ? "female" : "male"}
              </Badge>

              {user.tags.map((tag) => (
                <Badge key={tag} variant={tag === "suspicious account" ? "destructive" : "primary"}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Red Flags Report */}
        {user.redFlagsReport && (
          <Accordion type="single" collapsible className="mt-0 w-full pt-0">
            <AccordionItem
              value="disclaimer"
              className={`bg-secondary overflow-hidden rounded-xl border opacity-80 ${
                user.tags.includes("suspicious account")
                  ? "border-destructive bg-destructive/5"
                  : ""
              }`}
            >
              <AccordionTrigger className="not-prose -mt-4 mb-1 px-3 py-0">
                Authenticity Assessment:{" "}
                {user.tags.includes("suspicious account")
                  ? "Suspicious Account"
                  : "Not suspicious"}
              </AccordionTrigger>
              <AccordionContent className="prose-sm px-3 pb-3">
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
            <h3 className="mb-2 font-semibold">
              My detransition story
            </h3>

            <div className="border-t">
              <div
                className="mt-4 max-w-none prose-table"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(user.experience || ""),
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Top Comments */}
        <UserComments username={user.username} initialComments={comments} />
      </div>
    </div>
  );
}
