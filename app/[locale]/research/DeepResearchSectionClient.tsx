"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the chat section with no SSR
const DynamicChatSection = dynamic(
  () => import("@/app/components/ui/chat/chat-section"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="text-muted-foreground animate-spin" />
      </div>
    ),
  },
);

interface ChatSectionClientProps {
  conversationId?: string;
  locale: string;
  starterQuestion?: string;
}

export default function ChatSectionClient({
  conversationId,
  locale,
  starterQuestion,
}: ChatSectionClientProps) {
  return (
    <DynamicChatSection
      conversationId={conversationId}
      locale={locale}
      starterQuestion={starterQuestion}
      apiEndpoint="/api/research"
    />
  );
}
