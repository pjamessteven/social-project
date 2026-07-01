"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { cn } from "@/app/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatMessageAvatar } from "./chat-avatar";
import { ChatMessageContent } from "./chat-message-content";
import { ComponentDef } from "./custom/events/types";
import { FeedbackButtons } from "./feedback-buttons";

export default function CustomChatMessages({
  componentDefs,
  appendError,
  hideControls,
  conversationId,
  isArchived,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
  hideControls?: boolean;
  conversationId?: string;
  isArchived?: boolean;
}) {
  const { messages } = useChatUI();
  const { chatStatus } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  // Detect manual scroll — if user scrolls away from bottom, pause auto-scroll
  useEffect(() => {
    const container = document.querySelector("main");
    if (!container) return;

    const handleScroll = () => {
      const atBottom =
        Math.abs(
          container.scrollHeight - container.scrollTop - container.clientHeight,
        ) < 80;
      userScrolledRef.current = !atBottom;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    const container = document.querySelector("main");
    if (!container) return;

    // New message sent — always jump to bottom and release scroll lock
    if (chatStatus === "submitted") {
      userScrolledRef.current = false;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "instant",
        });
      });
      return;
    }

    // During streaming — only auto-scroll if user hasn't scrolled up
    if (chatStatus === "streaming") {
      if (!userScrolledRef.current) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "instant",
        });
      }
      return;
    }
  }, [messages, chatStatus]);

  // Track which messages have already played their fade-in
  const animatedMessages = useRef<Set<number>>(new Set());

  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "rtf">("pdf");

  const handleDownload = () => {
    if (!conversationId) {
      console.error("No conversation found in URL");
      return;
    }

    // Close the dialog
    setIsDownloadDialogOpen(false);

    // Trigger download based on selected format
    if (selectedFormat === "pdf") {
      window.open(`/api/chat/${conversationId}/export-pdf`, "_blank");
    } else {
      window.open(`/api/chat/${conversationId}/export-rtf`, "_blank");
    }
  };

  const handleDownloadClick = () => {
    setIsDownloadDialogOpen(true);
  };

  return (
    <ChatMessages className="!bg-transparent !p-0">
      <ChatMessages.List className="!overflow-visible pb-56">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const shouldFadeIn = !animatedMessages.current.has(index);
          if (shouldFadeIn) {
            animatedMessages.current.add(index);
          }

          return (
            <div key={index} className="group">
              <ChatMessage
                message={message}
                isLast={index === messages.length - 1}
                className={cn(
                  "dark:prose-invert prose max-w-none",
                  message.role == "user" && "user-message mr-12 sm:mr-0",
                  shouldFadeIn && "animate-[fadeIn_0.4s_ease-out]",
                )}
              >
                <div className="hidden sm:block">
                  <ChatMessageAvatar />
                </div>
                <ChatMessageContent
                  componentDefs={componentDefs}
                  appendError={appendError}
                />
                <div className="transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <ChatMessage.Actions />
                </div>
              </ChatMessage>
              {message.role === "assistant" && !isArchived && (
                <div className="-mt-4 -mb-8 ml-1 flex hidden items-start transition-opacity sm:ml-12 sm:opacity-0 sm:group-hover:opacity-100">
                  <FeedbackButtons
                    messageId={message.id}
                    conversationId={conversationId || ""}
                    isArchived={false}
                  />
                </div>
              )}
              {isLast && (
                <ChatMessages.Loading className="mb-4 -ml-16 sm:mr-0" />
              )}

              {isLast && hideControls && (
                <div className="flex justify-end">
                  {messages.length > 0 && (
                    <>
                      <div
                        onClick={handleDownloadClick}
                        className="mr-16 cursor-pointer pr-2 font-semibold hover:underline sm:mr-0"
                      >
                        <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-center text-sm opacity-90 transition-colors sm:text-base">
                          Download Conversation
                          <div className="mx-2 whitespace-nowrap">
                            <Download className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <Dialog
          open={isDownloadDialogOpen}
          onOpenChange={setIsDownloadDialogOpen}
        >
          <DialogContent className="min-w-80 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Choose File Format</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup
                value={selectedFormat}
                onValueChange={(value) =>
                  setSelectedFormat(value as "pdf" | "rtf")
                }
                className="space-y-3"
              >
                {/*
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="cursor-pointer">
                    PDF Document
                  </Label>
                </div>
                 */}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rtf" id="rtf" />
                  <Label htmlFor="rtf" className="cursor-pointer">
                    RTF (Rich Text Format)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDownloadDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleDownload}>
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* dummy div for scroll anchor */}
        <div ref={messagesEndRef} />

        <div className="flex h-full max-w-screen items-center px-4 sm:px-0">
          {messages.length === 0 && (
            <div className="">
              <h1 className="text-xl font-bold">Hello there!</h1>
              <p className="text-muted-foreground">
                I'm detrans.ai, the collective consciousness of detransitioners
                🦎
              </p>
            </div>
          )}
        </div>
      </ChatMessages.List>
    </ChatMessages>
  );
}
