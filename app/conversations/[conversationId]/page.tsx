import ConversationsPageClient, {
  ConversationsResponse,
} from "@/app/components/content/ConversationsPage";

async function getConversations(): Promise<ConversationsResponse | undefined> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/chat/conversations`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch conversations:", response.statusText);
      return undefined;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return undefined;
  }
}

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  const conversations = await getConversations();

  return <ConversationsPageClient conversations={conversations} currentConversationId={conversationId} />;
}
