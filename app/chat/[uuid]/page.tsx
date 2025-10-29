"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { use } from "react";

const ChatSection = dynamic(() => import("@/app/components/ui/chat/chat-section"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="text-muted-foreground animate-spin" />
    </div>
  ),
});

interface ChatPageProps {
  params: Promise<{ uuid: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { uuid } = use(params);
  
  return <ChatSection conversationId={uuid} />;
}
