import { ConversationSummary } from "@/app/components/content/ConversationsPage";
import SeoConversationsPage from "@/app/components/content/SeoConversationsPage";
import { isBot } from "@/app/lib/isBot";
import { Metadata } from "next";
import { headers } from "next/headers";

// Client component for the interactive chat section
import ChatSectionClient from "../ChatSectionClient";

interface ChatPageProps {
  params: Promise<{ uuid: string; locale: string }>;
}

// Function to fetch conversations
async function fetchConversations(
  featured: boolean = false,
  page: number = 1,
  limit: number = 20,
): Promise<{ items: ConversationSummary[]; pagination: any }> {
  try {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    if (featured) {
      params.set("featured", "true");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/chat?${params.toString()}`;

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
    return { items: [], pagination: null };
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return { items: [], pagination: null };
  }
}

async function fetchFeaturedConversations(): Promise<ConversationSummary[]> {
  const data = await fetchConversations(true, 1, 10);
  return data.items || [];
}

async function fetchAllConversations(): Promise<ConversationSummary[]> {
  const data = await fetchConversations(false, 1, 20);
  return data.items || [];
}

async function fetchSingleConversation(
  uuid: string,
): Promise<ConversationSummary | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/chat/conversations/${uuid}`;

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
  params: Promise<{ uuid: string }>;
}): Promise<Metadata> {
  const { uuid } = await params;
  const conversation = await fetchSingleConversation(uuid);

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
      const messages = JSON.parse(conversation.messages);
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
  const shortDescription =
    description.length > 150
      ? description.substring(0, 150) + "..."
      : description;

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
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  if (bot) {
    // For bots, fetch conversations server-side
    const [featuredConversations, allConversations, singleConversation] =
      await Promise.all([
        fetchFeaturedConversations(),
        fetchAllConversations(),
        fetchSingleConversation(uuid),
      ]);

    // If we have the single conversation, add it to the lists if not already present
    let conversations = allConversations;
    let featuredConvs = featuredConversations;

    if (singleConversation) {
      // Check if conversation is already in the lists
      const isInAll = allConversations.some(
        (conv: ConversationSummary) => conv.uuid === uuid,
      );
      const isInFeatured = featuredConversations.some(
        (conv: ConversationSummary) => conv.uuid === uuid,
      );

      if (!isInAll) {
        conversations = [singleConversation, ...allConversations];
      }

      if (singleConversation.featured && !isInFeatured) {
        featuredConvs = [singleConversation, ...featuredConversations];
      }
    }

    return (
      <SeoConversationsPage
        conversations={conversations}
        featuredConversations={featuredConvs}
        currentConversationId={uuid}
      />
    );
  }

  // Real users get the interactive client component
  return <ChatSectionClient conversationId={uuid} locale={locale} />;
}
