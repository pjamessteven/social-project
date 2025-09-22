// app/components/ScrollRestoration.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    // Save scroll position before navigation
    const saveScroll = () => {
      sessionStorage.setItem(`scroll-${pathname}`, String(window.scrollY));
    };

    // Restore scroll position after content loads
    const restoreScroll = () => {
      const saved = sessionStorage.getItem(`scroll-${pathname}`);
      if (saved) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          window.scrollTo(0, parseInt(saved, 10));
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
