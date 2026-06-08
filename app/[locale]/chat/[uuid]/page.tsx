import { ConversationSummary } from "@/app/components/content/ConversationsPage";
import { formatCountryDisplay } from "@/app/lib/countries";
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

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string; locale: string }>;
}): Promise<Metadata> {
  const { uuid, locale } = await params;
  const conversation = await fetchSingleConversation(uuid, locale);
  console.log("getmetadata", conversation);
  if (!conversation) {
    return {
      title: "Chat Conversation",
      description: "A conversation about gender identity questions",
    };
  }

  // Use conversation summary if available, otherwise extract from messages
  let description = conversation.conversationSummary || "";

  if (!description) {
    // Fallback: Parse messages to extract content for metadata
    try {
      const messages = conversation.messages;
      if (Array.isArray(messages)) {
        // Extract the first user message as the question
        const firstUserMessage = messages.find(
          (msg: any) => msg.role === "user" && msg.parts?.[0]?.type === "text",
        );
        const question =
          firstUserMessage?.parts[0]?.text || "Gender identity discussion";

        // Extract the first assistant message as the answer
        const firstAssistantMessage = messages.find(
          (msg: any) =>
            msg.role === "assistant" && msg.parts?.[0]?.type === "text",
        );
        const answer = firstAssistantMessage?.parts[0]?.text || "";

        description = answer || `Discussion about ${question}`;
      }
    } catch (error) {
      console.error("Failed to parse messages for metadata:", error);
      description = `Discussion about gender identity in ${conversation.mode} mode`;
    }
  }

  // Create a shortened version for the description
  const shortDescription = description;

  // Use title if available, otherwise create from first message
  let title = conversation.title || "";
  if (!title) {
    try {
      const messages = JSON.parse(conversation.messages);
      if (Array.isArray(messages)) {
        const firstUserMessage = messages.find(
          (msg: any) => msg.role === "user" && msg.parts?.[0]?.type === "text",
        );
        title = firstUserMessage?.parts[0]?.text || "Chat Conversation";
      }
    } catch (error) {
      title = "Chat Conversation";
    }
  }

  const fullTitle = `${title} - anon conversation with detrans.ai`;

  return {
    title: fullTitle,
    description: shortDescription,
    openGraph: {
      title: fullTitle,
      description: shortDescription,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: shortDescription,
    },
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
