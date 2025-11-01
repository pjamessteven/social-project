"use client";

import { ChatMessage } from "@llamaindex/chat-ui";
import LizardAnimation from "../lizard-animation";

export function ChatMessageAvatar() {
  return (
    <ChatMessage.Avatar className="relative bg-secondary">

        <div className="absolute top-[5px] right-[5px] z-0 w-[20px] rotate-145 ">
          <LizardAnimation />

      </div>
    </ChatMessage.Avatar>
  );
}
