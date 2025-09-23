"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export function ContentWarningDialog() {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Content Warning:</DialogTitle>
          <DialogDescription className="prose dark:prose-invert mt-2 text-base">
            This website contains perspectives and experiences from people
            detransitioners and desisters. This information may conflict with
            your current beliefs.
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
