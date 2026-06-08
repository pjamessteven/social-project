"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { HCaptchaDialog } from "@/app/components/ui/hcaptcha-dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  conversationId: string;
  messageId: string;
}

/**
 * Dialog shown when a user clicks thumbs down on an assistant message.
 * Allows the user to optionally provide text feedback explaining what was wrong.
 * Uses the existing count-based captcha system for anonymous users.
 *
 * Once feedback text is submitted, the vote is permanently locked.
 */
export function FeedbackDialog({
  isOpen,
  onClose,
  onSubmit,
  conversationId,
  messageId,
}: FeedbackDialogProps) {
  const t = useTranslations("feedback");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);

  const submitFeedback = async (text: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/chat/${conversationId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          vote: "down",
          feedbackText: text || undefined,
        }),
      });

      if (response.status === 402) {
        // Captcha required for anonymous users
        setShowCaptcha(true);
        setIsSubmitting(false);
        return;
      }

      if (response.status === 403) {
        toast.error(t("voteLocked"));
        onClose();
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success(t("thankYou"));
      setFeedbackText("");
      onSubmit();
      onClose();
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast.error(t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    submitFeedback(feedbackText);
  };

  const handleCaptchaVerify = async (token: string) => {
    try {
      const verifyResponse = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const verifyData = await verifyResponse.json();
      if (verifyData.success) {
        setShowCaptcha(false);
        // Retry feedback submission after captcha verification
        await submitFeedback(feedbackText);
      } else {
        toast.error(t("error"));
      }
    } catch (error) {
      console.error("Captcha verification error:", error);
      toast.error(t("error"));
    }
  };

  const handleCaptchaClose = () => {
    setShowCaptcha(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={t("placeholder") + "\n" + t("prompt")}
              rows={4}
              className="w-full sm:text-base"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "..." : t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HCaptchaDialog
        isOpen={showCaptcha}
        onClose={handleCaptchaClose}
        onVerify={handleCaptchaVerify}
        siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
      />
    </>
  );
}
