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
import { cn, uuidv4 } from "@/app/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { Download, RefreshCcw } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChatMessageAvatar } from "./chat-avatar";
import { ChatMessageContent } from "./chat-message-content";
import { ComponentDef } from "./custom/events/types";

export default function CustomChatMessages({
  componentDefs,
  appendError,
  hideControls,
  conversationId,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
  hideControls?: boolean;
  conversationId?: string;
}) {
  const { messages, stop } = useChatUI();
  const { chatStatus } = useChatStore();
  const router = useRouter();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Scroll to bottom every time messages update
  useEffect(() => {
    const container = document.querySelector("main");
    if (!container) return;

    const isAtBottom =
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight,
      ) < 100; // within 70px of bottom

    if (isAtBottom || chatStatus === "submitted") {
      // only scroll if user was already at bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, chatStatus]);

  const newConversation = () => {
    if (stop) {
      stop();
    }
    const newConversationId = uuidv4();
    const newUrl = `/chat/` + newConversationId;
    router.replace(newUrl);
  };

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
              {isLast && (
                <ChatMessages.Loading className="mb-4 -ml-16 sm:mr-0" />
              )}
              {isLast && !hideControls && (
                <div className="-mt-2 mb-4 ml-3 flex w-full flex-row justify-between pr-20 sm:mb-8 sm:pr-4">
                  <div className="flex w-full grow flex-row justify-between pt-8">
                    <Link
                      href={"/"}
                      className="cursor-pointer font-semibold no-underline"
                    >
                      <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-sm opacity-90 transition-colors sm:text-base">
                        <div className="mr-2 whitespace-nowrap no-underline">
                          {"<-"}
                        </div>
                        <div className="hidden hover:underline sm:block">
                          {"Back to Portal"}
                        </div>
                        <div className="hover:underline sm:hidden">
                          {"Back"}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-4">
                      {messages.length > 0 && (
                        <>
                          <div
                            onClick={handleDownloadClick}
                            className="cursor-pointer border-r pr-2 font-semibold hover:underline"
                          >
                            <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-center text-sm opacity-90 transition-colors sm:text-base">
                              <div className="mr-2 whitespace-nowrap">
                                <Download className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="cursor-pointer">
                    PDF Document
                  </Label>
                </div>
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
