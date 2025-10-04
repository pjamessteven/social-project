"use client";

import { slugify } from "@/app/lib/utils";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const path = usePathname();

  const { messages, isLoading } = useChatUI();

  const lastUserMessage = useMemo(() => {
    return messages?.findLast((x) => x.role === "user");
  }, [messages]);

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
                  <ChatMessages.Loading className="-ml-16 sm:mr-0" />
                  {!isLoading && (
                    <div className="text-foreground ml-3 flex items-center text-white">
                      {mode == "affirm" ? (
                        <Link
                          key={index}
                          prefetch={false}
                          href={
                            (isDev ? "/chat/" : "https://detrans.ai/chat/") +
                            slugify(lastUserMessage?.content as string)
                          }
                          target="_blank"
                          className="cursor-pointer font-medium italic underline hover:underline"
                        >
                          {"-> See detrans perspectives on this topic"}
                        </Link>
                      ) : (
                        <Link
                          key={index}
                          prefetch={false}
                          href={
                            (isDev
                              ? "/affirm/chat/"
                              : "https://genderaffirming.ai/affirm/chat/") +
                            slugify(lastUserMessage?.content as string)
                          }
                          target="_blank"
                          className="cursor-pointer font-medium italic underline hover:underline"
                        >
                          {"-> See trans perspectives on this topic"}
                        </Link>
                      )}
                      <ExternalLink className="ml-2 h-4" />
                    </div>
                  )}
                  <Link
                    key={index}
                    href={path.includes("compare") ? "/compare" : "/"}
                    className="mt-8 ml-3 cursor-pointer font-medium italic hover:underline"
                  >
                    {path.includes("/compare")
                      ? "<- Back to Compare"
                      : "<- Back to Portal"}
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
      </ChatMessages.List>
    </ChatMessages>
  );
}
