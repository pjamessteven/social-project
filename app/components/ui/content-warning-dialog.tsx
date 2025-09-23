"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Content Warning:</DialogTitle>
          <DialogDescription className="text-base">
            This website contains experiences and perspectives from
            detransitioners. This information may conflict with your current
            beliefs.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={handleAccept}>I Understand</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
