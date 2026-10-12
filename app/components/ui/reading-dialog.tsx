"use client";

import { Check, Share2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Button } from "./button";
import { Dialog, DialogContent } from "./dialog";

export interface ReadingDialogShare {
  /** Share URL, or a getter resolved at click time (needs window.location). */
  url: string | (() => string);
  title?: string;
  text?: string;
}

export interface ReadingDialogLabels {
  share?: string;
  copyLink?: string;
  copied?: string;
  close?: string;
}

interface ReadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Small meta line under the title (date, country, stats, …). */
  meta?: ReactNode;
  /** Share/copy-link action in the header; omit to hide the share button. */
  share?: ReadingDialogShare | null;
  labels?: ReadingDialogLabels;
  children: ReactNode;
}

/**
 * Full-height reading dialog: header with title/meta and share/close actions,
 * plus a scrollable body. Reused by FeaturedConversations (chat transcripts)
 * and the stats stories section (full stories).
 */
export function ReadingDialog({
  open,
  onOpenChange,
  title,
  meta,
  share,
  labels,
  children,
}: ReadingDialogProps) {
  const t = useTranslations("readingDialog");
  const [copied, setCopied] = useState(false);

  const shareTitle = labels?.share ?? t("share");
  const copyLinkTitle = labels?.copyLink ?? t("copyLink");
  const copiedMessage = labels?.copied ?? t("copied");
  const closeTitle = labels?.close ?? t("close");

  // Copy to clipboard with toast notification
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(copiedMessage);
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
      toast.success(copiedMessage);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  // Handle share button click
  const handleShareClick = async () => {
    if (!share) return;
    const url = typeof share.url === "function" ? share.url() : share.url;

    // Check if Web Share API is available
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: share.title,
          text: share.text,
          url,
        });
      } catch (err) {
        // User cancelled the share or there was an error
        // Fall back to clipboard copy
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Share failed:", err);
          copyToClipboard(url);
        }
      }
    } else {
      // Fall back to clipboard copy
      copyToClipboard(url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showOverlay={true}
        className="h-full w-screen max-w-4xl p-0 sm:max-w-screen lg:max-h-[90vh] lg:w-3xl"
      >
        <div className="flex h-[100vh] h-full flex-col overflow-y-auto lg:h-[90vh]">
          {/* Header */}
          <div className="bg-primary-foreground px-4 py-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold">{title}</h2>
                {meta && <div className="mt-1 flex flex-col gap-1">{meta}</div>}
              </div>
              <div className="flex items-center gap-1">
                {share && (
                  <Button
                    variant={"ghost"}
                    onClick={handleShareClick}
                    className="h-10 w-10 rounded-full p-0 hover:bg-gray-100"
                    aria-label={shareTitle}
                    title={
                      typeof navigator !== "undefined" &&
                      navigator.share !== undefined
                        ? shareTitle
                        : copyLinkTitle
                    }
                  >
                    {copied ? (
                      <Check className="h-5 w-auto text-green-500" />
                    ) : (
                      <Share2 className="h-5 w-auto text-gray-500" />
                    )}
                  </Button>
                )}
                <Button
                  variant={"ghost"}
                  onClick={() => onOpenChange(false)}
                  className="h-10 w-10 rounded-full p-0 hover:bg-gray-100"
                  aria-label={closeTitle}
                >
                  <X className="h-5 w-auto text-gray-500" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
