"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * One hub of the /topics index. Below `md` it is an accordion section like
 * the stats page's (a large header button, the panel expanding below with
 * the grid-template-rows 0fr -> 1fr trick); from `md` up it is a card (the
 * site's CARD_SURFACE, written out with `md:` prefixes, a little darker in
 * dark mode so the long lists sit quieter on the band) with `desktopHeader`
 * and the hub's icon on top, and the panel is always open. The panel's
 * content is server-rendered and always in the DOM, so crawlers see every
 * link; while collapsed it is `invisible`, which also takes its links out of
 * the tab order.
 */
export function TopicHubAccordion({
  id,
  title,
  summary,
  desktopHeader,
  icon,
  children,
}: {
  id: string;
  title: string;
  summary: string | null;
  /** Header shown from `md` up (a link to the hub page). */
  desktopHeader: ReactNode;
  /** The hub's icon, shown beside the desktop header. */
  icon: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `${id}-panel`;
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="dark:md:bg-secondary/50 scroll-mt-16 border-t first-of-type:border-t-0 md:mb-10 md:rounded-2xl md:border md:bg-white md:p-6 md:shadow-sm md:last:mb-0 md:first-of-type:border-t lg:p-8"
    >
      <div className="hidden items-start justify-between gap-6 md:flex">
        <div className="min-w-0 flex-1">{desktopHeader}</div>
        {icon}
      </div>
      <h3 id={headingId} className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full cursor-pointer items-center gap-4 py-5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-lg leading-snug font-semibold">
              {title}
            </span>
            {summary && (
              <span className="text-muted-foreground mt-1 block text-sm">
                {summary}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden
            className={`text-muted-foreground h-5 w-5 shrink-0 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out md:grid-rows-[1fr] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div
          className={`min-h-0 overflow-hidden ${open ? "" : "invisible md:visible"}`}
        >
          <div className="pb-6 md:pb-0">{children}</div>
        </div>
      </div>
    </section>
  );
}
