"use client";

import useRequestCounter from "@/app/lib/useRequestCounter";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CustomChatInput } from "../ui/chat/custom-chat-input";

interface ChatPageProps {
  mode: "detrans" | "affirm";
  starterQuestion?: string;
  hideChatInput?: boolean;
}

const ChatSection = dynamic(() => import("../ui/chat/chat-section"), {
  ssr: false,
  loading: () => (
    <div className="text-foreground flex h-full w-full items-center justify-center">
      <Loader2 className="text-muted-foreground animate-spin" />
    </div>
  ),
});

export default function ChatPage({
  mode,
  starterQuestion,
  hideChatInput,
}: ChatPageProps) {
  const [chatKey, setChatKey] = useState(0);
  const [hasIncremented, setHasIncremented] = useState(false);
  const { count, increment } = useRequestCounter();

  const resetChat = () => {
    setChatKey((prev) => prev + 1);
  };

  useEffect(() => {
    //  increment();
    resetChat();
  }, [starterQuestion]);

  useEffect(() => {
    // increment # of requests only once
    if (!hasIncremented) {
      increment();
      setHasIncremented(true);
    }
  }, [hasIncremented, increment]);

  const showDonationMessage = count % 5 == 0;

  return (
    <>
      <ChatSection
        mode={mode}
        starterQuestion={starterQuestion}
        onReset={resetChat}
        key={chatKey} // forces ChatUI + handler to reset
        showDonationMessage={showDonationMessage}
      />
      {!hideChatInput && (
        <CustomChatInput
          mode={mode}
          placeholder={
            mode == "detrans"
              ? "Ask 50,000 detransitioners a question..."
              : "Ask 600,000+ trans people"
          }
        />
      )}
    </>
  );
}
