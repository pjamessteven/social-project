"use server";

import { isBot } from "@/app/lib/isBot";
import {
  capitaliseWords,
  deslugify,
  markdownToPlainText,
  uuidv4,
} from "@/app/lib/utils";
import { marked } from "marked";
import { Metadata } from "next";
import { headers } from "next/headers";

// Client component for the interactive chat section
import ChatSectionClient from "../DeepResearchSectionClient";

interface DeepResearchPageProps {
  params: Promise<{ question: string; locale: string }>;
}

interface QuestionData {
  name: string;
  finalResponse: string | null;
  viewsCount: number | null;
  mostRecentlyAsked: Date | null;
  createdAt: Date | null;
}

async function fetchResearchQuestion(
  questionName: string,
): Promise<QuestionData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const encodedQuestion = encodeURIComponent(questionName);
    const apiUrl = `${baseUrl}/api/research/${encodedQuestion}`;

    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.question as QuestionData;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch research question:", error);
    return null;
  }
}

async function incrementQuestionViews(questionName: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const encodedQuestion = encodeURIComponent(questionName);
    const apiUrl = `${baseUrl}/api/research/${encodedQuestion}/views`;

    await fetch(apiUrl, {
      method: "POST",
      cache: "no-store",
    });
  } catch (error) {
    console.error("Failed to increment question views:", error);
    // Don't throw - analytics failures shouldn't break the application
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ question: string; locale: string }>;
}): Promise<Metadata> {
  const { question, locale } = await params;
  const q = deslugify(question);

  // Get answer from API
  const questionData = await fetchResearchQuestion(q);
  const answer = questionData?.finalResponse;

  const description = answer
    ? markdownToPlainText(answer.slice(0, 300))
    : `Research about ${q}`;

  const title = `${capitaliseWords(q)} - Research | detrans.ai`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DeepResearchPage({
  params,
}: DeepResearchPageProps) {
  const { question, locale } = await params;
  const q = deslugify(question);
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  // For bots, fetch cached content for SEO
  if (bot || true) {
    // Increment view count for this question
    await incrementQuestionViews(q);

    const questionData = await fetchResearchQuestion(q);
    const cachedAnswer = questionData?.finalResponse;

    if (cachedAnswer) {
      return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <h1 className="mb-6 text-3xl font-bold">{capitaliseWords(q)}</h1>
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: marked.parse(cachedAnswer) }}
          />
        </div>
      );
    }
  }

  // Real users get the interactive chat component
  return (
    <ChatSectionClient
      conversationId={uuidv4()}
      locale={locale}
      starterQuestion={q}
    />
  );
}
