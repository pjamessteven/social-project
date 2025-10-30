"use client";

import { cn } from "@/app/lib/utils";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import Link from "next/link";
import { useEffect, useRef } from "react";
import DonationCard from "../../content/DonationCard";
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
      ) < 100; // within 50px of bottom

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
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;

          return (
            <div key={index}>
              <ChatMessage
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
              {isLast && (
                <>
                  <Link
                    href={"/"}
                    className="mt-16 mb-4 ml-3 cursor-pointer font-semibold hover:underline"
                  >
                    <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-base opacity-90 transition-colors sm:text-base">
                      <div className="mr-2 whitespace-nowrap">{"<-"}</div>
                      <div className="hover:underline">{"Back to Portal"}</div>
                    </div>
                  </Link>
                  <Link
                    href={"/chat"}
                    className="mt-16 mb-4 ml-3 cursor-pointer font-semibold hover:underline"
                  >
                    <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-base opacity-90 transition-colors sm:text-base">
                      <div className="mr-2 whitespace-nowrap">{"->"}</div>
                      <div className="hover:underline">{"New Conversation"}</div>
                    </div>
                  </Link>

                  {true && (
                    <div className="mt-4 mr-16 ml-4 sm:mx-0">
                      <DonationCard mode={"detrans"} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
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
