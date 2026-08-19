"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

interface HCaptchaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (token: string) => void;
  onError?: (error: Error) => void;
  siteKey: string;
  descriptionKey?: "description" | "descriptionConversations";
  errorMessage?: string | null;
  resetSignal?: number;
}

export function HCaptchaDialog({
  isOpen,
  onClose,
  onVerify,
  onError,
  siteKey,
  descriptionKey = "description",
  errorMessage,
  resetSignal = 0,
}: HCaptchaDialogProps) {
  const t = useTranslations("hcaptcha");
  const { theme } = useTheme();
  const captchaRef = useRef<HCaptcha>(null);

  // Reset the hCaptcha widget when signaled (e.g. after a failed verify)
  useEffect(() => {
    if (resetSignal > 0) {
      captchaRef.current?.resetCaptcha();
    }
  }, [resetSignal]);

  const handleVerify = (token: string) => {
    onVerify(token);
  };

  const handleError = (event: string) => {
    console.error("hCaptcha error:", event);
    onError?.(new Error(`hCaptcha error: ${event}`));
  };

  const handleExpire = () => {
    console.log("hCaptcha token expired");
    captchaRef.current?.resetCaptcha();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="mb-2">{t("title")}</DialogTitle>
          <DialogDescription>{t(descriptionKey)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          {errorMessage && (
            <p className="text-destructive text-sm font-medium" role="alert">
              {errorMessage}
            </p>
          )}
          <HCaptcha
            ref={captchaRef}
            sitekey={siteKey}
            onVerify={handleVerify}
            onError={handleError}
            onExpire={handleExpire}
            theme={theme === "dark" ? "dark" : "light"}
            size="normal"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
