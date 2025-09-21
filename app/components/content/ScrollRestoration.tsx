// app/components/ScrollRestoration.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    // Restore scroll
    const saved = sessionStorage.getItem(`scroll-${pathname}`);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
    }

    // Save on unload or navigation
    const saveScroll = () => {
      sessionStorage.setItem(`scroll-${pathname}`, String(window.scrollY));
    };

    window.addEventListener("beforeunload", saveScroll);
    return () => {
      saveScroll();
      window.removeEventListener("beforeunload", saveScroll);
    };
  }, [pathname]);

  return null;
}
