import ConversationsPageClient from "@/app/components/content/ConversationsPage";

interface ConversationsPageProps {
  searchParams: Promise<{ conversationId?: string }>;
}

export default async function ConversationsPage({ searchParams }: ConversationsPageProps) {
  const { conversationId } = await searchParams;
  
  return <ConversationsPageClient currentConversationId={conversationId} />;
}
