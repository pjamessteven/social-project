"use client";

import { cn, uuidv4 } from "@/app/lib/utils";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const { messages, setMessages, stop } = useChatUI();

  const router = useRouter();

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

  const newConversation = () => {
    if (stop) {
      stop();
    }
    const newConversationId = uuidv4();
    const newUrl = `/chat/` + newConversationId;
    router.replace(newUrl);
  };

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
                <div className="-mt-2 mb-4 ml-3 flex w-full flex-row justify-between pr-20 sm:mb-8 sm:pr-16">
                  <div className="flex w-full grow flex-row justify-between border-t pt-8">
                    <Link
                      href={"/"}
                      className="cursor-pointer font-semibold no-underline"
                    >
                      <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-sm opacity-90 transition-colors sm:text-base">
                        <div className="mr-2 whitespace-nowrap no-underline">
                          {"<-"}
                        </div>
                        <div className="hover:underline">
                          {"Back to Portal"}
                        </div>
                      </div>
                    </Link>
                    <div
                      onClick={newConversation}
                      className="cursor-pointer font-semibold hover:underline"
                    >
                      <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-center text-sm opacity-90 transition-colors sm:text-base">
                        <div className="mr-2 whitespace-nowrap">
                          <RefreshCcw className="h-4 w-4" />
                        </div>
                        <div className="hover:underline">
                          {"New Conversation"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {/* dummy div for scroll anchor */}
        <div ref={messagesEndRef} />

        <div className="px-4 sm:px-0">
          <ChatMessages.Empty
            heading="Hello there!"
            subheading="I'm detrans.ai - the collective consciousness of detransitioners 🦎"
          />
        </div>
        <ChatMessages.Loading />
      </ChatMessages.List>
      <ChatStarter />
    </ChatMessages>
  );
}
