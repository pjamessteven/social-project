"use client";

import { cn } from "@/app/lib/utils";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FeedbackDialog } from "./feedback-dialog";

interface FeedbackButtonsProps {
  messageId: string;
  conversationId: string;
  isArchived: boolean;
}

type VoteState = "up" | "down" | null;

/**
 * Thumbs up/down feedback buttons for assistant messages.
 *
 * Behavior:
 * - Thumbs up: submits immediately (no dialog). Can be toggled.
 * - Thumbs down: opens a feedback dialog. Once feedback text is submitted,
 *   the vote is permanently locked and cannot be changed.
 * - If the conversation is archived, buttons are not rendered.
 * - Existing vote state is loaded from the API on mount.
 *
 * Uses the same count-based captcha system as chat messages.
 * Logged-in users bypass captcha.
 */
export function FeedbackButtons({
  messageId,
  conversationId,
  isArchived,
}: FeedbackButtonsProps) {
  const t = useTranslations("feedback");
  const [vote, setVote] = useState<VoteState>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Load existing vote state on mount
  useEffect(() => {
    if (!conversationId || !messageId) {
      setIsLoading(false);
      return;
    }

    const loadVote = async () => {
      try {
        const response = await fetch(
          `/api/chat/${conversationId}/feedback?messageId=${encodeURIComponent(messageId)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setVote(data.vote);
          setIsLocked(data.isLocked);
        }
      } catch (error) {
        console.error("Failed to load feedback state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVote();
  }, [conversationId, messageId]);

  const submitVote = useCallback(
    async (newVote: VoteState) => {
      if (!conversationId || !messageId) return;

      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/chat/${conversationId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, vote: newVote }),
        });

        if (response.status === 402) {
          // Should not happen for thumbs up (no dialog), but handle gracefully
          toast.error(t("error"));
          return;
        }

        if (response.status === 403) {
          toast.error(t("voteLocked"));
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to submit feedback");
        }

        setVote(newVote);
      } catch (error) {
        console.error("Feedback submission error:", error);
        toast.error(t("error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationId, messageId, t],
  );

  const handleThumbsUp = async () => {
    if (isLocked || isSubmitting) return;

    // Toggle: if already upvoted, remove vote
    const newVote: VoteState = vote === "up" ? null : "up";
    await submitVote(newVote);
  };

  const handleThumbsDown = () => {
    if (isLocked || isSubmitting) return;
    setShowDialog(true);
  };

  const handleDialogSubmit = () => {
    setVote("down");
    setIsLocked(true);
    setShowDialog(false);
  };

  // Don't render if archived or still loading
  if (isArchived || isLoading) return null;

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleThumbsUp}
          disabled={isSubmitting || isLocked}
          title={vote === "up" ? "Remove vote" : "Good response"}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            vote === "up"
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ThumbsUp
            className={cn("h-4 w-4", vote === "up" && "fill-current")}
          />
        </button>
        <button
          type="button"
          onClick={handleThumbsDown}
          disabled={isSubmitting || isLocked}
          title="Bad response"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            vote === "down"
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ThumbsDown
            className={cn("h-4 w-4", vote === "down" && "fill-current")}
          />
        </button>
      </div>

      <FeedbackDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onSubmit={handleDialogSubmit}
        conversationId={conversationId}
        messageId={messageId}
      />
    </>
  );
}
