"use client";

import type { StudyCategoryRef } from "@/app/lib/study-category-urls";
import { Study } from "@/app/types/study";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { SearchBar } from "../ui/search-bar";
import { matchesStudyQuery } from "./StudiesHub";
import { StudyList } from "./StudyList";

/**
 * Study grid for one category, with chips to narrow by the other kind
 * (methods on a topic page, topics on a method page) and a text search.
 */
export function StudyCategoryView({
  studies,
  filterKind,
  locale,
  isAdmin,
  categoryId,
}: {
  categoryId: number;
  studies: Study[];
  filterKind: StudyCategoryRef["kind"];
  locale: string;
  isAdmin: boolean;
}) {
  const t = useTranslations("studiesPage");
  const [filterId, setFilterId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter options in curated order (studies carry refs already sorted)
  const options = useMemo(() => {
    const byId = new Map<number, { ref: StudyCategoryRef; count: number }>();
    for (const study of studies) {
      for (const ref of study.categories ?? []) {
        if (ref.kind !== filterKind) continue;
        const entry = byId.get(ref.id) ?? { ref, count: 0 };
        entry.count++;
        byId.set(ref.id, entry);
      }
    }
    return [...byId.values()].sort((a, b) => b.count - a.count);
  }, [studies, filterKind]);

  const query = searchQuery.trim().toLowerCase();
  const visible = studies.filter(
    (s) =>
      (filterId === null || s.categories?.some((c) => c.id === filterId)) &&
      (!query || matchesStudyQuery(s, query)),
  );

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
      active
        ? "bg-foreground text-background border-foreground"
        : "dark:bg-secondary bg-white hover:border-foreground/30"
    }`;

  return (
    <div className="space-y-6">
      {/* Pinned while scrolling the grid (1px above the scroller edge so no
          seam shows at fractional zoom); chips scroll sideways on mobile so
          the bar stays short. */}
      <div className="sticky -top-px z-20 -mx-4 space-y-3 bg-white px-4 pt-[calc(0.75rem+1px)] pb-3 dark:bg-black">
        {studies.length > 6 && (
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("searchPlaceholder")}
            className="w-full"
          />
        )}
        {options.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            <button
              className={chip(filterId === null)}
              onClick={() => setFilterId(null)}
            >
              {t("all")} <span className="opacity-60">{studies.length}</span>
            </button>
            {options.map(({ ref, count }) => (
              <button
                key={ref.id}
                className={chip(filterId === ref.id)}
                onClick={() =>
                  setFilterId((prev) => (prev === ref.id ? null : ref.id))
                }
              >
                {ref.name} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length > 0 ? (
        <StudyList
          studies={visible}
          locale={locale}
          isAdmin={isAdmin}
          currentCategoryId={categoryId}
        />
      ) : (
        <p className="text-muted-foreground">{t("noResults")}</p>
      )}
    </div>
  );
}
