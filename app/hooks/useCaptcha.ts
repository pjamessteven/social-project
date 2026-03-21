"use client";

import { useCallback, useState } from "react";

interface UseCaptchaReturn {
  isCaptchaRequired: boolean;
  isVerifying: boolean;
  showCaptchaDialog: boolean;
  pendingMessage: { text: string; conversationId?: string } | null;
  setCaptchaRequired: (required: boolean) => void;
  setShowCaptchaDialog: (show: boolean) => void;
  setPendingMessage: (
    message: { text: string; conversationId?: string } | null,
  ) => void;
  verifyCaptcha: (token: string) => Promise<boolean>;
  resetCaptcha: () => void;
}

export function useCaptcha(): UseCaptchaReturn {
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCaptchaDialog, setShowCaptchaDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{
    text: string;
    conversationId?: string;
  } | null>(null);

  const verifyCaptcha = useCallback(async (token: string): Promise<boolean> => {
    setIsVerifying(true);
    try {
      const response = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setIsCaptchaRequired(false);
        setShowCaptchaDialog(false);
        return true;
      } else {
        console.error("CAPTCHA verification failed:", data.error);
        return false;
      }
    } catch (error) {
      console.error("Error verifying CAPTCHA:", error);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const resetCaptcha = useCallback(() => {
    setIsCaptchaRequired(false);
    setShowCaptchaDialog(false);
    setPendingMessage(null);
    setIsVerifying(false);
  }, []);

  const setCaptchaRequired = useCallback((required: boolean) => {
    setIsCaptchaRequired(required);
    if (required) {
      setShowCaptchaDialog(true);
    }
  }, []);

  return {
    isCaptchaRequired,
    isVerifying,
    showCaptchaDialog,
    pendingMessage,
    setCaptchaRequired,
    setShowCaptchaDialog,
    setPendingMessage,
    verifyCaptcha,
    resetCaptcha,
  };
}
