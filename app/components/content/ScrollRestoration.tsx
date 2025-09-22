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

    // Save scroll position for a specific path
    const saveScrollForPath = (path: string) => {
      const scrollableElement = getScrollableElement();
      if (scrollableElement) {
        const scrollTop = scrollableElement.scrollTop;
        console.log(`Saving scroll position for ${path}: ${scrollTop}`);
        sessionStorage.setItem(`scroll-${path}`, String(scrollTop));
      }
    };

    // Restore scroll position after content loads
    const restoreScroll = () => {
      const saved = sessionStorage.getItem(`scroll-${pathname}`);
      const scrollableElement = getScrollableElement();
      
      console.log(`Attempting to restore scroll for ${pathname}: ${saved}`);
      
      if (saved && scrollableElement) {
        const scrollTop = parseInt(saved, 10);
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          scrollableElement.scrollTop = scrollTop;
          console.log(`Restored scroll position to: ${scrollTop}, actual: ${scrollableElement.scrollTop}`);
        }, 100);
      }
    };

    // Throttled scroll handler to save position periodically
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => saveScrollForPath(pathname), 100);
    };

    const scrollableElement = getScrollableElement();
    
    // Restore scroll on page load
    if (document.readyState === 'complete') {
      restoreScroll();
    } else {
      window.addEventListener('load', restoreScroll);
    }

    // Listen for scroll events to save position
    if (scrollableElement) {
      scrollableElement.addEventListener('scroll', handleScroll);
    }

    // Save scroll on navigation/unload
    const handleBeforeUnload = () => saveScrollForPath(pathname);
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      // Save scroll position for the current path before cleanup
      saveScrollForPath(pathname);
      clearTimeout(scrollTimeout);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener('load', restoreScroll);
      if (scrollableElement) {
        scrollableElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [pathname]);

  return null;
}
