import type { MouseEvent, ReactNode } from "react";

/**
 * Link styling shared by the table-of-contents lists (desktop sidebar and
 * mobile jump-to box) and by sidebar link lists such as related pages.
 *
 * Plain module (no "use client") so both server and client components can
 * render it — it must not call client-only helpers like `cn`, so classes are
 * composed here without conflicts to merge.
 */
export const wikiTocLinkClass = "block px-2 py-1 text-sm whitespace-normal";

export function WikiTocLink({
  href,
  active = false,
  className,
  onClick,
  children,
}: {
  href: string;
  /** Emphasizes the section currently in view (scroll-spy). */
  active?: boolean;
  className?: string;
  /** Optional click handler (used by controlled TOC lists). */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={[
        wikiTocLinkClass,
        active
          ? "text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </a>
  );
}
