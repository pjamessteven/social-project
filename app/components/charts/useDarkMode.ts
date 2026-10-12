"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the site's active theme. The theme bootstrap toggles a `dark` class
 * on <html>, so a MutationObserver is more reliable than a media query (the
 * user can override their system preference).
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
