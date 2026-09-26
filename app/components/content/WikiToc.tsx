"use client";

import { useEffect, useState } from "react";
import { WikiTocLink } from "./WikiTocLink";

export interface WikiTocNode {
  id: string;
  text: string;
}

/**
 * Wiki table-of-contents links with scroll-spy: the currently viewed section
 * renders bold. Only h2 sections are listed (DocsLayout filters the heading
 * data), so the list is flat — h3 subsections never appear.
 */
export function WikiTocLinks({ items }: { items: WikiTocNode[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = items.map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    // A heading is "current" while it sits in the top band of the viewport.
    // Works for any scroll container (the page scrolls inside <main>).
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const firstVisible = ids.find((id) => visible.has(id));
        if (firstVisible) setActiveId(firstVisible);
      },
      { rootMargin: "0px 0px -65% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <WikiTocLink
          key={item.id}
          href={`#${item.id}`}
          active={activeId === item.id}
        >
          {item.text}
        </WikiTocLink>
      ))}
    </div>
  );
}
