"use client";

import { slugify } from "@/app/lib/utils";
import {
  ChatMessage,
  ChatMessages,
  TextPart,
  useChatUI,
} from "@llamaindex/chat-ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import DonationCard from "../../content/DonationCard";
import { cn } from "../lib/utils";
import { ChatMessageContent } from "./chat-message-content";
import { ComponentDef } from "./custom/events/types";

export default function CustomChatMessages({
  componentDefs,
  appendError,
  onReset,
  mode,
  showDonationMessage,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
  onReset: () => void;
  mode: "detrans" | "affirm" | "compare";
  showDonationMessage: boolean;
}) {
  const isDev = process.env.NODE_ENV === "development";
  const path = usePathname();

  const isCompare = path.includes("/compare/");

  const { messages, isLoading } = useChatUI();

  const lastUserMessage = useMemo(() => {
    const message = messages?.findLast((x) => x.role === "user");
    return (message?.parts[0] as TextPart)?.text;
  }, [messages]);

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
  }, [messages, isLoading]);

  return (
    <ChatMessages className="!bg-transparent !p-0">
      <ChatMessages.List className="!overflow-visible pb-28">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          return (
            <>
              <ChatMessage
                key={index}
                message={message}
                isLast={isLast}
                className={cn(
                  "dark:prose-invert prose max-w-none",
                  message.role == "user" && "user-message mr-12 sm:mr-0",
                )}
              >
    
                <ChatMessageContent
                  componentDefs={componentDefs}
                  appendError={appendError}
                  mode={isCompare ? "compare" : mode}
                />
                <ChatMessage.Actions />
              </ChatMessage>
              {isLast && (
                <>
                  <ChatMessages.Loading className="-ml-16 sm:mr-0" />
                  {!isLoading && (
                    <>
                      <div className="text-foreground mr-16 ml-3 flex items-center border-b">
                        {mode == "affirm" ? (
                          <Link
                            key={index}
                            prefetch={false}
                            href={
                              (isDev
                                ? "/research/"
                                : "https://detrans.ai/research/") + slugify("")
                            }
                            target="_blank"
                            className="font-regular text-muted-foreground cursor-pointer italic no-underline"
                          >
                            <div className="flex flex-row items-center pt-0 pb-3">
                              <div className="text-muted-foreground hover:text-foreground no-wrap flex cursor-pointer flex-row items-start text-base italic transition-colors transition-opacity sm:text-base">
                                <div className="mr-2 whitespace-nowrap">
                                  {"->"}
                                </div>
                                <div className="hover:underline">
                                  See detrans perspectives on this topic
                                </div>
                              </div>
                              <ExternalLink className="ml-2 h-4" />
                            </div>
                          </Link>
                        ) : (
                          <Link
                            key={index}
                            prefetch={false}
                            href={
                              (isDev
                                ? "/affirm/research/"
                                : "https://genderaffirming.ai/affirm/research/") +
                              slugify(lastUserMessage || "")
                            }
                            target="_blank"
                            className="text-muted-foreground cursor-pointer font-medium italic no-underline"
                          >
                            <div className="flex flex-row items-center pt-0 pb-3">
                              <div className="text-muted-foreground hover:text-foreground no-wrap flex cursor-pointer flex-row items-start text-base italic transition-colors transition-opacity sm:text-base">
                                <div className="mr-2 whitespace-nowrap">
                                  {"->"}
                                </div>
                                <div className="hover:underline">
                                  See trans perspectives on this topic
                                </div>
                              </div>
                              <ExternalLink className="ml-2 h-4" />
                            </div>
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                  <Link
                    key={index}
                    href={isCompare ? "/compare" : "/"}
                    className="mt-16 mb-4 ml-3 cursor-pointer font-semibold hover:underline"
                  >
                    <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-base opacity-90 transition-colors sm:text-base">
                      <div className="mr-2 whitespace-nowrap">{"<-"}</div>
                      <div className="hover:underline">
                        {isCompare ? "Back to Compare" : "Back to Portal"}
                      </div>
                    </div>
                  </Link>
                  {showDonationMessage && (
                    <div className="mt-4 mr-16 ml-4 sm:mx-0">
                      <DonationCard mode={mode} />
                    </div>
                  )}
                  {index > 0 && (
                    /* dummy div for scroll anchor */
                    <div ref={messagesEndRef} />
                  )}
                </>
              )}
            </>
          );
        })}
      </ChatMessages.List>
    </ChatMessages>
  );
}
