"use client";

import { useEffect } from "react";

interface TabScrollHandlerProps {
  hasSearchParams: boolean;
}

export function TabScrollHandler({ hasSearchParams }: TabScrollHandlerProps) {
  useEffect(() => {
    if (hasSearchParams) {
      const scrollToTabs = () => {
        const tabsElement = document.getElementById("question-tabs");
        if (tabsElement) {
          tabsElement.scrollIntoView({ 
            behavior: "smooth", 
            block: "start" 
          });
          return true;
        }
        return false;
      };

      // Try immediately
      if (scrollToTabs()) return;

      // If not found, try with increasing delays
      const delays = [50, 100, 200, 500];
      const timers: NodeJS.Timeout[] = [];

      delays.forEach((delay) => {
        const timer = setTimeout(() => {
          if (scrollToTabs()) {
            // Clear remaining timers if successful
            timers.forEach(clearTimeout);
          }
        }, delay);
        timers.push(timer);
      });

      // Cleanup function
      return () => {
        timers.forEach(clearTimeout);
      };
    }
  }, [hasSearchParams]);

  return null; // This component doesn't render anything
}
