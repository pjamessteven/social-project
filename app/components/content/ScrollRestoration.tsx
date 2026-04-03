"use client";

import { useMainStore } from "@/stores/main-store";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const STORAGE_KEY = (path: string) => `scroll-${path}`;

export default function ScrollRestoration() {
  const pathname = usePathname();
  const { setScrollPosition } = useMainStore();

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const saveScrollToStorage = () => {
      const position = main.scrollTop;
      sessionStorage.setItem(STORAGE_KEY(pathname), String(position));
    };

    const restoreScroll = () => {
      const saved = sessionStorage.getItem(STORAGE_KEY(pathname));
      if (!saved) return;

      const position = parseInt(saved, 10);
      setTimeout(() => {
        main.scrollTop = position;
        setScrollPosition(position);
      }, 0);
    };

    // Debounced storage handler - only debounce sessionStorage write
    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      const position = main.scrollTop;
      setScrollPosition(position); // Call immediately - not debounced

      clearTimeout(timeout);
      timeout = setTimeout(saveScrollToStorage, 100);
    };

    // Restore on load
    if (document.readyState === "complete") {
      restoreScroll();
    } else {
      window.addEventListener("load", restoreScroll);
    }

    main.addEventListener("scroll", handleScroll);

    const handleBeforeUnload = () => saveScrollToStorage();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(timeout);
      main.removeEventListener("scroll", handleScroll);
      window.removeEventListener("load", restoreScroll);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pathname, setScrollPosition]);

  return null;
}
