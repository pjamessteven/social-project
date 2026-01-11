import ConversationsPageClient, {
  ConversationSummary,
} from "@/app/components/content/ConversationsPage";
import SeoConversationsPage from "@/app/components/content/SeoConversationsPage";
import { isBot } from "@/app/lib/isBot";
import { headers } from "next/headers";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ featured?: string }>;
}

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
  conversationId: string,
): Promise<ConversationSummary | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/chat/conversations/${conversationId}`;

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

export default async function ConversationPage({
  params,
  searchParams,
}: ConversationPageProps) {
  const { conversationId } = await params;
  const { featured } = await searchParams;
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  if (bot) {
    // For bots, fetch both featured and all conversations server-side
    const [featuredConversations, allConversations, singleConversation] =
      await Promise.all([
        fetchFeaturedConversations(),
        fetchAllConversations(),
        fetchSingleConversation(conversationId),
      ]);

    // If we have the single conversation, add it to the lists if not already present
    let conversations = allConversations;
    let featuredConvs = featuredConversations;

    if (singleConversation) {
      // Check if conversation is already in the lists
      const isInAll = allConversations.some(
        (conv: ConversationSummary) => conv.uuid === conversationId,
      );
      const isInFeatured = featuredConversations.some(
        (conv: ConversationSummary) => conv.uuid === conversationId,
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
        currentConversationId={conversationId}
      />
    );
  }

  // Real users get the interactive client component
  return <ConversationsPageClient currentConversationId={conversationId} />;
}
