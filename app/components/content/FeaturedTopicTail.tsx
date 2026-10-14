"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Speech-bubble tail on the featured-topic card, lined up under the nav's
 * Topics tab. Tab positions vary with locale and viewport, so it's measured;
 * the tail stays hidden when the tab isn't on screen.
 */
export default function FeaturedTopicTail() {
  const ref = useRef<HTMLSpanElement>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const card = ref.current?.parentElement;
    if (!card) return;

    const measure = () => {
      const tab = document.querySelector<HTMLElement>(
        '[data-nav-tab="topics"]',
      );
      const tabRect = tab?.getBoundingClientRect();
      if (!tabRect || tabRect.width === 0) {
        setLeft(null);
        return;
      }
      const cardRect = card.getBoundingClientRect();
      const x = tabRect.left + tabRect.width / 2 - cardRect.left;
      // Keep clear of the rounded corners.
      setLeft(x >= 24 && x <= cardRect.width - 24 ? x : null);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      // A rotated square in the card's colour; its upper two edges carry the
      // card's ring (light) or border (dark), and it covers the card's edge
      // where they meet.
      className="dark:bg-secondary pointer-events-none absolute -top-[7px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-tl-[3px] bg-white shadow-[-1px_-1px_0_0_rgba(14,63,126,0.14)] transition-opacity dark:border-t dark:border-l dark:shadow-none"
      style={{ left: left ?? 0, opacity: left === null ? 0 : 1 }}
    />
  );
}
