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
import { useRef } from "react";

interface HCaptchaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (token: string) => void;
  onError?: (error: Error) => void;
  siteKey: string;
}

export function HCaptchaDialog({
  isOpen,
  onClose,
  onVerify,
  onError,
  siteKey,
}: HCaptchaDialogProps) {
  const t = useTranslations("hcaptcha");
  const { theme } = useTheme();
  const captchaRef = useRef<HCaptcha>(null);

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
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-start pt-2">
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
