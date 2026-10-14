"use client";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/lib/utils";
import { MultiSelect } from "@/app/components/ui/multi-select";
import { SlidingNavGroup } from "@/app/components/ui/sliding-nav-group";
import { SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SectionFiltersContext } from "./useFeatureData";

interface Tag {
  name: string;
  nameTranslation: string | null;
  userCount: number;
}

function localizedTagName(tag: Tag, locale: string): string {
  if (!tag.nameTranslation) return tag.name;
  try {
    const translations = JSON.parse(tag.nameTranslation) as Record<
      string,
      string
    >;
    return translations[locale] || tag.name;
  } catch {
    return tag.name;
  }
}

export interface StatsFilterState {
  sex: string;
  setSex: (sex: string) => void;
  tagNames: string[];
  setTagNames: (tagNames: string[]) => void;
  hasFilters: boolean;
  clear: () => void;
  /** Overrides for the feature APIs' query string (see useFeatureQuery). */
  overrides: { sex: string; tag: string };
}

/** Section-local sex + tag filters, seeded from the page's query string. */
export function useStatsFilters(): StatsFilterState {
  const searchParams = useSearchParams();
  const [sex, setSex] = useState(() => searchParams.get("sex") ?? "");
  const [tagNames, setTagNames] = useState<string[]>(() =>
    (searchParams.get("tag") ?? "").split(",").filter(Boolean),
  );
  const tag = tagNames.join(",");
  const overrides = useMemo(() => ({ sex, tag }), [sex, tag]);
  return {
    sex,
    setSex,
    tagNames,
    setTagNames,
    hasFilters: !!sex || tagNames.length > 0,
    clear: () => {
      setSex("");
      setTagNames([]);
    },
    overrides,
  };
}

/**
 * Sex toggle + tag picker for one stats section. On mobile a single
 * "Filters" button (plus a summary once something is selected) expands the
 * controls; from sm up they sit on one row.
 */
export default function StatsFilters({
  id,
  filters,
}: {
  /** Unique per section, for the mobile toggle's aria-controls. */
  id: string;
  filters: StatsFilterState;
}) {
  const tVideos = useTranslations("videoList.filters");
  const tStories = useTranslations("stories.filters");
  const tFilters = useTranslations("statsPage.filters");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const { sex, setSex, tagNames, setTagNames, hasFilters, clear } = filters;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tags", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { tags: Tag[] } | null) => {
        if (json) setTags(json.tags);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // MultiSelect works on display strings; map them back to tag names.
  const tagOptions = useMemo(
    () =>
      tags.map((tag) => ({
        name: tag.name,
        display: `${localizedTagName(tag, locale)} (${tag.userCount})`,
      })),
    [tags, locale],
  );
  const displayOf = (name: string) =>
    tagOptions.find((option) => option.name === name)?.display ?? name;
  const nameOf = (display: string) =>
    tagOptions.find((option) => option.display === display)?.name ?? display;

  const summary = [
    sex === "f" ? tVideos("female") : sex === "m" ? tVideos("male") : null,
    tagNames.length > 0
      ? tFilters("summary.tags", { count: tagNames.length })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="flex items-center gap-2 sm:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full px-4"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
        >
          <SlidersHorizontal className="mr-1.5 h-4 w-4" />
          {tFilters("title")}
        </Button>
        {summary && (
          <span className="text-muted-foreground min-w-0 truncate text-sm">
            {summary}
          </span>
        )}
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0 rounded-full px-3"
            onClick={clear}
          >
            {tStories("clearFilters")}
          </Button>
        )}
      </div>
      <div
        id={id}
        className={cn(
          open ? "mt-3 flex flex-col gap-3" : "hidden",
          "sm:mt-0 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-2",
        )}
      >
        <SlidingNavGroup
          tabs={[
            { key: "all", label: tVideos("all"), isActive: !sex },
            { key: "f", label: tVideos("female"), isActive: sex === "f" },
            { key: "m", label: tVideos("male"), isActive: sex === "m" },
          ]}
          onTabClick={(key) => setSex(key === "all" ? "" : key)}
          className="bg-secondary/50 dark:bg-secondary/30 self-start border"
        />
        <div className="w-full sm:w-auto sm:min-w-[200px] sm:flex-1">
          <MultiSelect
            options={tagOptions.map((option) => option.display)}
            selected={tagNames.map(displayOf)}
            onChange={(selected) => setTagNames(selected.map(nameOf))}
            placeholder={tStories("tagsPlaceholder")}
            className="min-h-[42px] rounded-full px-4"
          />
        </div>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden rounded-full px-4 sm:inline-flex"
            onClick={clear}
          >
            {tStories("clearFilters")}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * A stats section with its own filter bar above it: every chart inside
 * (via useFeatureQuery and the hooks built on it) uses these filters in
 * place of the page's.
 */
export function FilteredSection({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const filters = useStatsFilters();
  return (
    <SectionFiltersContext.Provider value={filters.overrides}>
      <div className="space-y-4">
        <StatsFilters id={`${id}-filters`} filters={filters} />
        {children}
      </div>
    </SectionFiltersContext.Provider>
  );
}
