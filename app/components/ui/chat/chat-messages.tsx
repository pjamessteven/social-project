"use client";

import { cn } from "@/app/lib/utils";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { useEffect, useRef } from "react";
import { ChatMessageContent } from "./chat-message-content";
import { ChatStarter } from "./chat-starter";
import { ComponentDef } from "./custom/events/types";

export default function CustomChatMessages({
  componentDefs,
  appendError,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
}) {
  const { messages } = useChatUI();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Scroll to bottom every time messages update
  useEffect(() => {
    const container = document.querySelector("main");
    if (!container) return;

    const isAtBottom =
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight,
      ) < 50; // within 50px of bottom

    if (isAtBottom) {
      // only scroll if user was already at bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <ChatMessages className="!bg-transparent !p-0">
      <ChatMessages.List className="!overflow-visible pb-28">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message}
            isLast={index === messages.length - 1}
            className={cn(
              "dark:prose-invert prose max-w-none",
              message.role == "user" && "user-message mr-12 sm:mr-0",
            )}
          >
            <ChatMessageContent
              componentDefs={componentDefs}
              appendError={appendError}
            />
            <ChatMessage.Actions />
          </ChatMessage>
        ))}
        {/* dummy div for scroll anchor */}
        <div ref={messagesEndRef} />
        <ChatMessages.Empty
          heading="Hello there!"
          subheading="I'm here to help you with your questions."
        />
        <ChatMessages.Loading />
      </ChatMessages.List>
      <ChatStarter />
    </ChatMessages>
  );
}
