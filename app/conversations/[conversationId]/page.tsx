import ConversationsPageClient from "@/app/components/content/ConversationsPage";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  
  return <ConversationsPageClient currentConversationId={conversationId} />;
}
