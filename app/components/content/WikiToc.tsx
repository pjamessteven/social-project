"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WikiTocLink } from "./WikiTocLink";

export interface WikiTocNode {
  id: string;
  text: string;
}

/**
 * Wiki table-of-contents links with scroll-spy: the currently viewed section
 * renders bold. Only h2 sections are listed (DocsLayout filters the heading
 * data), so the list is flat — h3 subsections never appear.
 *
 * Controlled mode: when `activeId` is provided the scroll-spy is disabled and
 * the active item is driven by external state (e.g. an accordion). Pass
 * `onNavigate` to intercept clicks instead of the default hash jump.
 */
export function WikiTocLinks({
  items,
  activeId: controlledActiveId,
  onNavigate,
}: {
  items: WikiTocNode[];
  /** Controlled active item. Omit for scroll-spy behaviour. */
  activeId?: string | null;
  /** Called on click; when set, the default hash navigation is prevented. */
  onNavigate?: (id: string) => void;
}) {
  const [spiedId, setSpiedId] = useState<string | null>(null);
  const isControlled = controlledActiveId !== undefined;

  useEffect(() => {
    if (isControlled) return;

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
        if (firstVisible) setSpiedId(firstVisible);
      },
      { rootMargin: "0px 0px -65% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items, isControlled]);

  const activeId = isControlled ? controlledActiveId : spiedId;

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <WikiTocLink
          key={item.id}
          href={`#${item.id}`}
          active={activeId === item.id}
          onClick={
            onNavigate
              ? (event) => {
                  event.preventDefault();
                  onNavigate(item.id);
                }
              : undefined
          }
        >
          {item.text}
        </WikiTocLink>
      ))}
    </div>
  );
}

/**
 * Shared desktop TOC sidebar (DocsLayout + stats page): an out-of-flow column
 * pinned to the left edge of the centered content, sticky while scrolling,
 * with an optional label and extra content under a divider.
 */
export function WikiTocAside({
  items,
  activeId,
  onNavigate,
  title,
  extras,
}: {
  items: WikiTocNode[];
  /** Controlled active item; omit for scroll-spy behaviour. */
  activeId?: string | null;
  /** Called on click; when set, the default hash navigation is prevented. */
  onNavigate?: (id: string) => void;
  /** Optional label shown above the links (e.g. "On this page"). */
  title?: ReactNode;
  /** Extra sidebar content rendered below a divider. */
  extras?: ReactNode;
}) {
  return (
    <div className="absolute inset-y-0 right-[calc(100%_+_1.5rem)] hidden w-56 xl:block">
      <aside className="not-prose sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {title && (
          <div className="text-muted-foreground mt-2 mb-1 ml-2 text-xs font-semibold tracking-wide uppercase">
            {title}
          </div>
        )}
        {items.length > 0 && (
          <WikiTocLinks
            items={items}
            activeId={activeId}
            onNavigate={onNavigate}
          />
        )}
        {extras && (
          <>
            <div className="bg-border mt-4 mb-4 h-px" />
            {extras}
          </>
        )}
      </aside>
    </div>
  );
}
