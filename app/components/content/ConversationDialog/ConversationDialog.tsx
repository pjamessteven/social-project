"use client";

import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { formatCountryDisplay } from "@/app/lib/countries";
import { cn, formatDate } from "@/app/lib/utils";
import { Check, Loader2, Share2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../ui/button";

// Dynamically import ChatSection to avoid loading it until needed
const ChatSection = dynamic(
  () => import("@/app/components/ui/chat/chat-section"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    ),
  },
);

interface ConversationDialogProps {
  conversationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  updatedAt?: string;
  country?: string | null;
  conversationSummary?: string | null;
  conversationSummaryTranslation?: string | null;
}

export function ConversationDialog({
  conversationId,
  open,
  onOpenChange,
  title,
  updatedAt,
  country,
  conversationSummary,
  conversationSummaryTranslation,
}: ConversationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(open);
  const [showId, setShowId] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localizedSummary, setLocalizedSummary] = useState<string | null>(null);

  // Get localized summary based on current locale
  useEffect(() => {
    if (!conversationSummaryTranslation) {
      setLocalizedSummary(conversationSummary ?? null);
      return;
    }

    try {
      const translations = JSON.parse(conversationSummaryTranslation) as Record<string, string>;
      const locale = navigator.language.split('-')[0]; // Get primary language code
      setLocalizedSummary(translations[locale] || conversationSummary || null);
    } catch {
      setLocalizedSummary(conversationSummary ?? null);
    }
  }, [conversationSummary, conversationSummaryTranslation]);

  // Sync internal state with props
  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    onOpenChange(newOpen);
  };

  // Show loading state when conversationId changes while dialog is open
  useEffect(() => {
    if (open && conversationId) {
      setIsLoading(true);
      // Small delay to show loading state
      const timer = setTimeout(() => setIsLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [conversationId, open]);

  // Handle share button click
  const handleShareClick = async () => {
    if (!conversationId) return;

    const chatUrl = `${window.location.origin}/chat/${conversationId}`;

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Conversation",
          text: "Check out this conversation",
          url: chatUrl,
        });
      } catch (err) {
        // User cancelled the share or there was an error
        // Fall back to clipboard copy
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Share failed:", err);
          copyToClipboard(chatUrl);
        }
      }
    } else {
      // Fall back to clipboard copy
      copyToClipboard(chatUrl);
    }
  };

  // Copy to clipboard with toast notification
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard");
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Link copied to clipboard");
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <Dialog open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showOverlay={true}
        className="h-full w-screen max-w-4xl p-0 sm:max-w-screen lg:max-h-[90vh] lg:w-3xl"
      >
        <div className="flex h-[100vh] h-full flex-col overflow-y-auto lg:h-[90vh]">
          {/* Header */}
          <div className="bg-primary-foreground px-4 py-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold">
                  {title || "Conversation"}
                </h2>
                <div className="mt-1 flex flex-col gap-1">
                  {/* Date and country info - clickable to toggle with ID */}
                  {(updatedAt || country || conversationId) && (
                    <div
                      onClick={() => setShowId(!showId)}
                      className="text-muted-foreground cursor-pointer text-sm select-text hover:text-gray-700"
                      title="Click to toggle between date/country and ID"
                    >
                      {showId && conversationId ? (
                        <span className="font-mono">{conversationId}</span>
                      ) : (
                        <>
                          {updatedAt && <span>{formatDate(updatedAt)}</span>}
                          {country &&
                            country !== "Unknown" &&
                            country !== "Local" && (
                              <span>
                                &nbsp;from&nbsp;{formatCountryDisplay(country)}
                              </span>
                            )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant={"ghost"}
                  onClick={handleShareClick}
                  className="h-10 w-10 rounded-full p-0 hover:bg-gray-100"
                  aria-label="Share conversation"
                  title={
                    navigator.share !== undefined
                      ? "Share conversation"
                      : "Copy link to conversation"
                  }
                  disabled={!conversationId}
                >
                  {copied ? (
                    <Check className="h-5 w-auto text-green-500" />
                  ) : (
                    <Share2 className="h-5 w-auto text-gray-500" />
                  )}
                </Button>
                <Button
                  variant={"ghost"}
                  onClick={() => handleOpenChange(false)}
                  className="h-10 w-10 rounded-full p-0 hover:bg-gray-100"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-auto text-gray-500" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
              </div>
            ) : conversationId ? (
              <div className="h-full pb-4">
                {localizedSummary && (
                  <div className="text-muted-foreground bg-primary-foreground px-4 pb-4">
                    {localizedSummary}
                  </div>
                )}
                {localizedSummary && (
                  <div className="border-primary sticky top-0 z-20 w-full border-t p-4"></div>
                )}
                {!localizedSummary && <div className="mt-4" />}
                <div
                  className={cn(
                    "z-10 overflow-x-hidden px-4 sm:px-0",
                    localizedSummary ? "-mt-4" : "",
                  )}
                >
                  <ChatSection
                    conversationId={conversationId}
                    readOnly={true}
                    key={conversationId} // Force re-render when conversationId changes
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">No conversation selected</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
