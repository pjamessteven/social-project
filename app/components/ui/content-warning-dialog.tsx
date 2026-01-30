"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

interface ContentWarningDialogProps {
  host: string;
}
export function ContentWarningDialog({ host }: ContentWarningDialogProps) {
  const t = useTranslations("contentWarning");
  const [isOpen, setIsOpen] = useState(false);
  const path = usePathname();

  const affirmShowWarningPath = path === "/videos";
  const supportPath = path === "/support";

  const mode =
    host.includes("detrans.ai") || process.env.NODE_ENV === "development"
      ? "detrans"
      : "affirm";

  const showDialog =
    (affirmShowWarningPath || mode === "detrans") && !supportPath;

  useEffect(() => {
    // Check if user has seen the warning before
    const hasSeenWarning = localStorage.getItem("content-warning-seen");
    if (!hasSeenWarning) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("content-warning-seen", "true");
    setIsOpen(false);
  };

  const handleExit = () => {
    window.location.href = "https://google.com";
  };

  if (!showDialog) {
    return <></>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="prose dark:prose-invert mt-2 text-base">
            <p className="mb-3">
              {t("description.line1")}
            </p>
            <p>
              {t("description.line2")}
            </p>

            <p>
              {t("description.line3")}
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex justify-end gap-2">
          <Button onClick={handleExit}>{t("buttons.exit")}</Button>

          <Button onClick={handleAccept}>{t("buttons.continue")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
