// app/components/ScrollRestoration.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    // Find the main scrollable element
    const getScrollableElement = () => {
      return document.querySelector('main');
    };

    // Save scroll position before navigation
    const saveScroll = () => {
      const scrollableElement = getScrollableElement();
      if (scrollableElement) {
        sessionStorage.setItem(`scroll-${pathname}`, String(scrollableElement.scrollTop));
      }
    };

    // Restore scroll position after content loads
    const restoreScroll = () => {
      const saved = sessionStorage.getItem(`scroll-${pathname}`);
      const scrollableElement = getScrollableElement();
      
      if (saved && scrollableElement) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          scrollableElement.scrollTop = parseInt(saved, 10);
        }, 100);
      }
    };

    // Restore scroll on page load
    if (document.readyState === 'complete') {
      restoreScroll();
    } else {
      window.addEventListener('load', restoreScroll);
    }

    // Save scroll on navigation/unload
    window.addEventListener("beforeunload", saveScroll);
    
    return () => {
      saveScroll();
      window.removeEventListener("beforeunload", saveScroll);
      window.removeEventListener('load', restoreScroll);
    };
  }, [pathname]);

  return null;
}
