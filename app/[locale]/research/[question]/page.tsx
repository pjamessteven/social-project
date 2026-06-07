"use server";

import { isBot } from "@/app/lib/isBot";
import {
  capitaliseWords,
  deslugify,
  markdownToPlainText,
  uuidv4,
} from "@/app/lib/utils";
import { localesInfo } from "@/i18n/locales";
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

  const canonicalUrl = `https://detrans.ai/${locale}/research/${question}`;

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
    alternates: {
      canonical: canonicalUrl,
      languages: Object.fromEntries(
        localesInfo.map((l) => [
          l.code === "en"
            ? "en-US"
            : l.code === "es"
              ? "es-ES"
              : l.code === "fr"
                ? "fr-FR"
                : l.code === "zh-cn"
                  ? "zh-CN"
                  : l.code === "zh-tw"
                    ? "zh-TW"
                    : `${l.code}-${l.code.toUpperCase()}`,
          `https://detrans.ai/${l.code}/research/${question}`,
        ]),
      ),
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

  // Fetch question data for all users (used for JSON-LD and bot rendering)
  const questionData = await fetchResearchQuestion(q);
  const cachedAnswer = questionData?.finalResponse;

  // For bots, fetch cached content for SEO
  if (bot) {
    // Increment view count for this question
    await incrementQuestionViews(q);

    if (cachedAnswer) {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "QAPage",
        mainEntity: {
          "@type": "Question",
          name: capitaliseWords(q),
          text: capitaliseWords(q),
          answerCount: 1,
          acceptedAnswer: {
            "@type": "Answer",
            text: markdownToPlainText(cachedAnswer.slice(0, 500)),
            dateCreated:
              questionData?.createdAt?.toISOString() ||
              new Date().toISOString(),
            upvoteCount: questionData?.viewsCount || 0,
          },
        },
        author: {
          "@type": "Organization",
          name: "detrans.ai",
          url: "https://detrans.ai",
        },
        url: `https://detrans.ai/${locale}/research/${question}`,
      };

      return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
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
  const jsonLd = cachedAnswer
    ? {
        "@context": "https://schema.org",
        "@type": "QAPage",
        mainEntity: {
          "@type": "Question",
          name: capitaliseWords(q),
          text: capitaliseWords(q),
          answerCount: 1,
          acceptedAnswer: {
            "@type": "Answer",
            text: markdownToPlainText(cachedAnswer.slice(0, 500)),
            dateCreated:
              questionData?.createdAt?.toISOString() ||
              new Date().toISOString(),
            upvoteCount: questionData?.viewsCount || 0,
          },
        },
        author: {
          "@type": "Organization",
          name: "detrans.ai",
          url: "https://detrans.ai",
        },
        url: `https://detrans.ai/${locale}/research/${question}`,
      }
    : null;

  return (
    <ChatSectionClient
      conversationId={uuidv4()}
      locale={locale}
      starterQuestion={q}
      jsonLd={jsonLd}
    />
  );
}
