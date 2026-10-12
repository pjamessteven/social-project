"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tracks an element's content width for hand-drawn SVG charts. Returns a
 * callback ref, so it also works for elements that mount after loading.
 */
export function useElementWidth<T extends HTMLElement>(initial = 640) {
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState(initial);
  const ref = useCallback((node: T | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return;
    setWidth(Math.round(element.getBoundingClientRect().width) || initial);
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(Math.round(next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, initial]);

  return [ref, width] as const;
}
