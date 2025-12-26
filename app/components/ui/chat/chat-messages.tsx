"use client";

import { cn, uuidv4 } from "@/app/lib/utils";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { Download, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChatMessageAvatar } from "./chat-avatar";
import { ChatMessageContent } from "./chat-message-content";
import { ComponentDef } from "./custom/events/types";

export default function CustomChatMessages({
  componentDefs,
  appendError,
  hideControls,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
  hideControls?: boolean;
}) {
  const { messages, stop } = useChatUI();

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

  const handleDownloadRTF = () => {
    // Get the current conversation UUID from the URL
    const pathSegments = window.location.pathname.split('/');
    const uuid = pathSegments[pathSegments.length - 1];
    
    if (!uuid) {
      console.error("No conversation UUID found in URL");
      return;
    }
    
    // Trigger download
    window.open(`/api/chat/${uuid}/export`, '_blank');
  };

  return (
    <ChatMessages className="!bg-transparent !p-0">
      <div className="border-b max-w-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 px-4 sm:px-0">
          <div className="text-muted-foreground text-left text-sm sm:text-center">
            I can make mistakes, I'm not a replacement for a real therapist!{" "}
            <br className="hidden sm:inline" /> Do not share any personal
            information that could be used to identify you.{" "}
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleDownloadRTF}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium whitespace-nowrap"
            >
              <Download className="h-3 w-3" />
              Download conversation
            </button>
          )}
        </div>
      </div>
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
                <div className="hidden sm:block">
                  <ChatMessageAvatar />
                </div>
                <ChatMessageContent
                  componentDefs={componentDefs}
                  appendError={appendError}
                />
                <ChatMessage.Actions />
              </ChatMessage>
              {isLast && <ChatMessages.Loading className="mb-4 -ml-16 sm:mr-0" />}
              {isLast && !hideControls && (
                <div className="-mt-2 mb-4 ml-3 flex w-full flex-row justify-between pr-20 sm:mb-8 sm:pr-16">
                  <div className="flex w-full grow flex-row justify-between pt-8">
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
                    <div className="flex items-center gap-4">
                      <div
                        onClick={handleDownloadRTF}
                        className="cursor-pointer font-semibold hover:underline"
                      >
                        <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-center text-sm opacity-90 transition-colors sm:text-base">
                          <div className="mr-2 whitespace-nowrap">
                            <Download className="h-4 w-4" />
                          </div>
                          <div className="hover:underline">
                            {"Download RTF"}
                          </div>
                        </div>
                      </div>
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
                </div>
              )}
            </div>
          );
        })}
        {/* dummy div for scroll anchor */}
        <div ref={messagesEndRef} />

        <div className="px-4 h-full  flex items-center sm:px-0 max-w-screen ">
          {messages.length === 0 && (
            <div className="">
              <h1 className="font-bold text-xl">Hello there!</h1>
              <p className="text-muted-foreground">
                I'm detrans.ai, the collective consciousness of detransitioners 🦎
              </p>
            </div>
          )}
        </div>
      </ChatMessages.List>
    </ChatMessages>
  );
}
