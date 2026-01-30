"use server";

import { isBot } from "@/app/lib/isBot";
import {
  getDeepResearchAnswer,
  incrementQuestionViews,
} from "@/app/lib/researchCacheHelpers";
import {
  capitaliseWords,
  deslugify,
  markdownToPlainText,
} from "@/app/lib/utils";
import { db } from "@/db";
import { detransQuestions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Metadata } from "next";
import { headers } from "next/headers";

// Client component for the interactive chat section
import ChatSectionClient from "../DeepResearchSectionClient";

interface DeepResearchPageProps {
  params: Promise<{ question: string; locale: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ question: string; locale: string }>;
}): Promise<Metadata> {
  const { question, locale } = await params;
  const q = deslugify(question);

  // Get answer from detrans_questions table
  const result = await db
    .select({ finalResponse: detransQuestions.finalResponse })
    .from(detransQuestions)
    .where(eq(detransQuestions.name, q.slice(0, 255)))
    .limit(1);

  const answer = result[0]?.finalResponse;

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

  // Increment view count for this question
  await incrementQuestionViews(q.slice(0, 255));

  // For bots, use getDeepResearchAnswer to get cached content for SEO
  if (bot) {
    console.log("isBot");
    const cachedAnswer = await getDeepResearchAnswer(q);
    console.log("cachedAnswer", cachedAnswer);
    if (cachedAnswer) {
      return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <h1 className="mb-6 text-3xl font-bold">{capitaliseWords(q)}</h1>
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: cachedAnswer }}
          />
        </div>
      );
    }
  }

  // Real users get the interactive chat component
  return (
    <ChatSectionClient
      conversationId={undefined}
      locale={locale}
      starterQuestion={q}
    />
  );
}
