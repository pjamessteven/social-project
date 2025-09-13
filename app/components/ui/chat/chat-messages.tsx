"use client";

import { slugify } from "@/app/lib/utils";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
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
  mode: "detrans" | "affirm";
  showDonationMessage: boolean;
}) {
  const isDev = process.env.NODE_ENV === "development";

  const { messages, isLoading } = useChatUI();

  const lastUserMessage = useMemo(() => {
    return messages?.findLast((x) => x.role === "user");
  }, [messages]);

  return (
    <ChatMessages className="!bg-transparent !p-0">
      <ChatMessages.List className="!overflow-visible pb-32">
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
                  message.role == "user" && "mr-12 sm:mr-0",
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
                  {!isLoading && (
                    <div className="row -mt-6 ml-3 flex items-center">
                      {mode == "affirm" ? (
                        <Link
                          key={index}
                          href={
                            (isDev ? "/chat/" : "https://detrans.ai/chat/") +
                            slugify(lastUserMessage?.content as string)
                          }
                          target="_blank"
                          className="cursor-pointer font-medium italic underline hover:underline"
                        >
                          {"-> What are detrans perspectives on this topic?"}
                        </Link>
                      ) : (
                        <Link
                          key={index}
                          href={
                            (isDev
                              ? "/affirm/chat/"
                              : "https://genderaffirming.ai/chat/") +
                            slugify(lastUserMessage?.content as string)
                          }
                          target="_blank"
                          className="cursor-pointer font-medium italic underline hover:underline"
                        >
                          {"-> What are trans perspectives on this topic?"}
                        </Link>
                      )}
                      <ExternalLink className="ml-2 h-4" />
                    </div>
                  )}
                  <Link
                    key={index}
                    href="/"
                    className="ml-2 cursor-pointer text-base italic hover:underline"
                  >
                    {"<- Back to Portal"}
                  </Link>
                  {showDonationMessage && (
                    <div className="mt-4 mr-16 ml-4 sm:mx-0">
                      <DonationCard mode={mode} />
                    </div>
                  )}
                </>
              )}
            </>
          );
        })}
        <ChatMessages.Loading />
      </ChatMessages.List>
    </ChatMessages>
  );
}
