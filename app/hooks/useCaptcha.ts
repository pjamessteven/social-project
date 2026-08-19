"use client";

import { useCallback, useState } from "react";

interface VerifyCaptchaResult {
  success: boolean;
  token: string;
  error?: string;
  retryAfter?: number;
  status?: number;
}

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
  verifyCaptcha: (
    token: string,
    options?: { conversationId?: string; purpose?: string },
  ) => Promise<VerifyCaptchaResult>;
  resetCaptcha: () => void;
}

export function useCaptcha(): UseCaptchaReturn {
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(() => {
    // CAPTCHA is disabled in development mode
    return process.env.NODE_ENV !== "development";
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCaptchaDialog, setShowCaptchaDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{
    text: string;
    conversationId?: string;
  } | null>(null);

  const verifyCaptcha = useCallback(
    async (
      token: string,
      options?: { conversationId?: string; purpose?: string },
    ): Promise<VerifyCaptchaResult> => {
      setIsVerifying(true);
      try {
        const response = await fetch("/api/captcha/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            ...(options?.conversationId
              ? { conversationId: options.conversationId }
              : {}),
            ...(options?.purpose ? { purpose: options.purpose } : {}),
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          setIsCaptchaRequired(false);
          setShowCaptchaDialog(false);
          return { success: true, token };
        }

        console.error("CAPTCHA verification failed:", data.error || response.status);
        return {
          success: false,
          token,
          error:
            typeof data.error === "string"
              ? data.error
              : "CAPTCHA verification failed",
          retryAfter:
            typeof data.retryAfter === "number" ? data.retryAfter : undefined,
          status: response.status,
        };
      } catch (error) {
        console.error("Error verifying CAPTCHA:", error);
        return {
          success: false,
          token,
          error: error instanceof Error ? error.message : "CAPTCHA verification failed",
        };
      } finally {
        setIsVerifying(false);
      }
    },
    [],
  );

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
