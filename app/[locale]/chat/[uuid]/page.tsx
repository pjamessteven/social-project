import { ConversationSummary } from "@/app/components/content/ConversationsPage";
import { formatCountryDisplay } from "@/app/lib/countries";
import { buildAlternates, localizedUrl, ogLocale } from "@/app/lib/seo";
import { Clock } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// Client component for the interactive chat section
import ChatSectionClient from "../ChatSectionClient";

interface ChatPageProps {
  params: Promise<{ uuid: string; locale: string }>;
}

async function fetchSingleConversation(
  uuid: string,
  locale: string,
): Promise<ConversationSummary | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/chat/${uuid}?locale=${locale}`;

    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch single conversation:", error);
    return null;
  }
}

type MessagePart = { type?: string; text?: string };
type ChatMessage = { role?: string; parts?: MessagePart[] };

/** First text part of the first message from `role`. */
function firstText(messages: unknown, role: string): string {
  if (typeof messages === "string") {
    try {
      messages = JSON.parse(messages);
    } catch {
      return "";
    }
  }
  if (!Array.isArray(messages)) return "";
  const message = (messages as ChatMessage[]).find(
    (msg) => msg.role === role && msg.parts?.[0]?.type === "text",
  );
  return message?.parts?.[0]?.text ?? "";
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string; locale: string }>;
}): Promise<Metadata> {
  const { uuid, locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo.conversations" });
  const conversation = await fetchSingleConversation(uuid, locale);
  if (!conversation) {
    return {
      title: `${t("untitled")} | detrans.ai`,
      robots: { index: false, follow: false },
    };
  }

  // Title and summary arrive localized from /api/chat/[uuid]; fall back to
  // the opening exchange for conversations that were never summarized.
  const title =
    conversation.title ||
    firstText(conversation.messages, "user") ||
    t("untitled");
  const description =
    conversation.conversationSummary ||
    firstText(conversation.messages, "assistant") ||
    t("description");
  const fullTitle = `${title} | detrans.ai`;
  const href = {
    pathname: "/chat/[uuid]" as const,
    params: { uuid },
  };

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: localizedUrl(href, locale),
      siteName: "detrans.ai",
      locale: ogLocale(locale),
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    alternates: buildAlternates(href, locale),
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { uuid, locale } = await params;
  const conversation = await fetchSingleConversation(uuid, locale);
  const t = await getTranslations({ locale, namespace: "conversationCard" });

  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t("date.today");
    } else if (diffDays === 1) {
      return t("date.yesterday");
    } else if (diffDays < 7) {
      return t("date.daysAgo", { count: diffDays });
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return t("date.weeksAgo", { count: weeks });
    } else {
      return date.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <>
      {conversation && (
        <div className="mx-auto mb-4 mb-8 max-w-4xl sm:px-4 sm:pt-8">
          <div className="rounded-2xl border bg-white p-3 sm:p-6 sm:shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h1 className="text-lg font-bold sm:text-xl">
              {conversation.title || "Chat Conversation"}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeDate(conversation.updatedAt)}</span>
              </div>
              {conversation.country && (
                <>
                  <span>·</span>
                  <span>{formatCountryDisplay(conversation.country)}</span>
                </>
              )}
            </div>
            {conversation.conversationSummary && (
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                {conversation.conversationSummary}
              </p>
            )}
          </div>
        </div>
      )}
      <ChatSectionClient conversationId={uuid} locale={locale} />
    </>
  );
}
