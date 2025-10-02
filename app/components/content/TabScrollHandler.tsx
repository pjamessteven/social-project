"use client";

import { useEffect } from "react";

interface TabScrollHandlerProps {
  hasSearchParams: boolean;
}

export function TabScrollHandler({ hasSearchParams }: TabScrollHandlerProps) {
  useEffect(() => {
    if (hasSearchParams) {
      // Use a small delay to ensure the page has fully rendered
      const timer = setTimeout(() => {
        const tabsElement = document.getElementById("question-tabs");
        if (tabsElement) {
          tabsElement.scrollIntoView({ 
            behavior: "smooth", 
            block: "start" 
          });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [hasSearchParams]);

  return null; // This component doesn't render anything
}
