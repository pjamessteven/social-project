"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { SECTION_TITLE } from "./ChartParts";

interface StatsSectionProps {
  id: string;
  title: string;
  description: string;
  isOpen: boolean;
  /** Once opened the panel stays mounted so re-opening is instant. */
  mounted: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * One accordion section of the stats page: a large clickable header with the
 * panel expanding below it. Inside the panel, charts are stacked one after
 * another with their own titles (no tabs). The panel animates with the
 * grid-template-rows 0fr -> 1fr trick, which needs no JS height measurement.
 */
export default function StatsSection({
  id,
  title,
  description,
  isOpen,
  mounted,
  onToggle,
  children,
}: StatsSectionProps) {
  const headingId = `${id}-heading`;
  const panelId = `${id}-panel`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="group scroll-mt-16 border-t first:border-t-0 md:scroll-mt-44"
    >
      <h2 id={headingId} className={SECTION_TITLE}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full cursor-pointer items-center gap-4 py-6 text-left group-first:pt-3"
        >
          <span className="min-w-0 flex-1">
            <span className="block">{title}</span>
            <span className="text-muted-foreground mt-1 block text-base font-normal">
              {description}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={`text-muted-foreground h-6 w-6 shrink-0 self-center transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          {mounted && <div className="px-1 pt-2 pb-12">{children}</div>}
        </div>
      </div>
    </section>
  );
}
