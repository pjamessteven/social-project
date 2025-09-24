"use client";

import { usePathname } from "next/navigation";
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
  const [isOpen, setIsOpen] = useState(false);
  const path = usePathname();

  const affirmShowWarningPath = path === "/stories";

  const mode =
    host.includes("detrans.ai") || process.env.NODE_ENV === "development"
      ? "detrans"
      : "affirm";

  const showDialog = affirmShowWarningPath || mode === "detrans";

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
          <DialogTitle>Content Warning:</DialogTitle>
          <DialogDescription className="prose dark:prose-invert mt-2 text-base">
            <p>
              This website contains perspectives and experiences from
              ex-transgender people who have detransitioned or desisted. This
              information may conflict with your current beliefs about gender.
            </p>
            <p>
              If you currently identify as transgender, you may find this
              content invalidating. Please make sure you are in the right
              headspace before continuing.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex justify-end gap-2">
          <Button onClick={handleExit}>Get me out of here!</Button>

          <Button onClick={handleAccept}>I Understand {"->"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
