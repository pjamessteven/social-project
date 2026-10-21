"use client";

import { useRouter } from "next/navigation";
import { MouseEvent, ReactNode, useRef } from "react";

/**
 * A list-item card that opens `href` when the card itself is clicked, while
 * leaving its text selectable. A stretched link overlay would make the whole
 * card an anchor, and dragging on an anchor drags the link instead of
 * selecting text; here the card is plain markup and we navigate from a click
 * handler only when the click wasn't a text selection and didn't land on a
 * real link. The card must still contain a real <a href={href}> (the title)
 * for keyboard users and crawlers.
 */
export function ClickableCard({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const mouseDownAt = useRef(0);

  const isPlainCardClick = (e: MouseEvent<HTMLLIElement>) => {
    if (e.defaultPrevented) return false;
    // Links, buttons and other controls inside the card handle themselves
    if ((e.target as HTMLElement).closest("a, button, input, textarea, select"))
      return false;
    // A click that ends a drag, or that leaves a selection, is a selection
    if (window.getSelection()?.toString()) return false;
    if (Date.now() - mouseDownAt.current > 300) return false;
    return true;
  };

  return (
    <li
      className={className}
      onMouseDown={() => {
        mouseDownAt.current = Date.now();
      }}
      onClick={(e) => {
        if (!isPlainCardClick(e)) return;
        // Modifier clicks keep their browser meaning: open in a new tab
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
          window.open(href, "_blank", "noopener");
          return;
        }
        router.push(href);
      }}
      onAuxClick={(e) => {
        // Middle click opens in a new tab, like it would on a link
        if (e.button !== 1 || !isPlainCardClick(e)) return;
        window.open(href, "_blank", "noopener");
      }}
    >
      {children}
    </li>
  );
}
