"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { cn } from "./ui/lib/utils";
import { MultiSelect } from "./ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import { SlidingNavGroup } from "./ui/sliding-nav-group";

interface Tag {
  id: number;
  name: string;
  nameTranslation: string | null;
  userCount: number;
}

function getLocalizedTagName(
  defaultName: string,
  nameTranslation: string | null,
  locale: string,
): string {
  if (!nameTranslation) return defaultName;

  try {
    const translations = JSON.parse(nameTranslation) as Record<string, string>;
    return translations[locale] || defaultName;
  } catch {
    return defaultName;
  }
}

const DEFAULT_MIN_AGE = 5;
const DEFAULT_MAX_AGE = 80;

/**
 * Sex / age / tag filters synced to the query string.
 *
 * `panel` (the /stats default) stacks the age slider above the other
 * controls. `inline` puts every control on one wrapping row of pill-shaped
 * controls, matching the /videos search + filter bar.
 */
export default function UsersFilters({
  layout = "panel",
}: {
  layout?: "panel" | "inline";
}) {
  const inline = layout === "inline";
  const t = useTranslations("stories.filters");
  const tVideos = useTranslations("videoList.filters");
  const tf = useTranslations("statsPage.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const selectedSex = searchParams.get("sex") || "";
  const selectedTagNames = searchParams
    .getAll("tag")
    .flatMap((tag) => tag.split(",").filter(Boolean));
  const [ageRange, setAgeRange] = useState(() => {
    const minAge = searchParams.get("minAge")
      ? parseInt(searchParams.get("minAge")!)
      : DEFAULT_MIN_AGE;
    const maxAge = searchParams.get("maxAge")
      ? parseInt(searchParams.get("maxAge")!)
      : DEFAULT_MAX_AGE;
    return [minAge, maxAge];
  });

  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch("/api/tags");
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTags();
  }, []);

  // Keep the current accordion section open across filter changes.
  const navigate = (params: URLSearchParams) => {
    const queryString = params.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}${hash}`);
  };

  const updateSexFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      params.set("sex", value);
    } else {
      params.delete("sex");
    }
    params.delete("page");
    navigate(params);
  };

  const updateTagsFilter = (selectedDisplayNames: string[]) => {
    const params = new URLSearchParams(searchParams);
    params.delete("tag");

    const selectedOriginalNames = selectedDisplayNames
      .map((displayName) => {
        const match = displayName.match(/^(.+) \(\d+\)$/);
        const displayNameWithoutCount = match ? match[1] : displayName;
        const tag = tags.find((candidate) => {
          const localizedName = getLocalizedTagName(
            candidate.name,
            candidate.nameTranslation,
            locale,
          );
          return (
            `${localizedName} (${candidate.userCount})` === displayName ||
            localizedName === displayNameWithoutCount
          );
        });
        return tag?.name;
      })
      .filter((name): name is string => !!name);

    if (selectedOriginalNames.length > 0) {
      params.set("tag", selectedOriginalNames.join(","));
    }
    params.delete("page");
    navigate(params);
  };

  const updateAgeFilter = (newRange: number[]) => {
    setAgeRange(newRange);
    const params = new URLSearchParams(searchParams);
    params.set("minAge", newRange[0].toString());
    params.set("maxAge", newRange[1].toString());
    params.delete("page");
    navigate(params);
  };

  const clearFilters = () => {
    setAgeRange([DEFAULT_MIN_AGE, DEFAULT_MAX_AGE]);
    navigate(new URLSearchParams());
  };

  const hasFilters =
    !!selectedSex ||
    selectedTagNames.length > 0 ||
    ageRange[0] !== DEFAULT_MIN_AGE ||
    ageRange[1] !== DEFAULT_MAX_AGE;

  const summaryParts: string[] = [];
  if (ageRange[0] !== DEFAULT_MIN_AGE || ageRange[1] !== DEFAULT_MAX_AGE) {
    summaryParts.push(
      tf("summary.age", { min: ageRange[0], max: ageRange[1] }),
    );
  }
  if (selectedSex) {
    summaryParts.push(selectedSex === "m" ? t("sex.male") : t("sex.female"));
  }
  if (selectedTagNames.length > 0) {
    summaryParts.push(tf("summary.tags", { count: selectedTagNames.length }));
  }
  const summary = summaryParts.length
    ? summaryParts.join(" · ")
    : tf("summary.none");

  const ageLabel = (
    <label className="text-sm whitespace-nowrap">
      <span className="font-semibold">{t("ageRange")} </span>{" "}
      {t("ageRangeYears", { min: ageRange[0], max: ageRange[1] })}
    </label>
  );
  const ageSlider = (
    <Slider
      value={ageRange}
      onValueChange={updateAgeFilter}
      min={DEFAULT_MIN_AGE}
      max={DEFAULT_MAX_AGE}
      step={1}
      className="w-full"
    />
  );
  const tagSelect = loading ? (
    <div
      className={cn(
        "h-10 animate-pulse bg-gray-100 dark:bg-gray-800",
        inline ? "h-[46px] rounded-full" : "rounded",
      )}
    />
  ) : (
    <MultiSelect
      options={tags.map((tag) => {
        const localizedName = getLocalizedTagName(
          tag.name,
          tag.nameTranslation,
          locale,
        );
        return `${localizedName} (${tag.userCount})`;
      })}
      selected={selectedTagNames.map((tagName) => {
        const tag = tags.find((candidate) => candidate.name === tagName);
        if (!tag) return tagName;
        const localizedName = getLocalizedTagName(
          tag.name,
          tag.nameTranslation,
          locale,
        );
        return `${localizedName} (${tag.userCount})`;
      })}
      onChange={updateTagsFilter}
      placeholder={t("tagsPlaceholder")}
      className={inline ? "min-h-[46px] rounded-full px-4" : undefined}
    />
  );
  const sexTabs = [
    { key: "all", label: tVideos("all"), isActive: !selectedSex },
    { key: "f", label: tVideos("female"), isActive: selectedSex === "f" },
    { key: "m", label: tVideos("male"), isActive: selectedSex === "m" },
  ];

  return (
    <div
      data-sticky-filters
      className="sticky top-0 z-20 -mx-4  px-4  pb-4"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm md:hidden">
        <SlidersHorizontal className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="font-medium">{tf("title")}</span>
        <span className="text-muted-foreground min-w-0 truncate">
          {summary}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {hasFilters && (
            <Button
              variant="ghost"
              size="xs"
              className="px-3"
              onClick={clearFilters}
            >
              {t("clearFilters")}
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            className="px-3"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="stats-filter-panel"
          >
            {expanded ? tf("hide") : tf("edit")}
            <ChevronDown
              className={`ml-1 h-3.5 w-3.5 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>
      </div>

      <div
        id="stats-filter-panel"
        className={`${expanded ? "mt-3 space-y-3" : "hidden"} md:block md:space-y-3`}
      >
        {inline ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[160px] flex-1">{tagSelect}</div>

            <div className="bg-background flex h-[46px] items-center gap-3 rounded-full border px-4 text-sm">
              {ageLabel}
              <div className="w-28 md:w-68">{ageSlider}</div>
            </div>

                                    <SlidingNavGroup
              tabs={sexTabs}
              onTabClick={updateSexFilter}
              className="bg-secondary/50 dark:bg-secondary/30 border"
            />
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-4"
                onClick={clearFilters}
              >
                {t("clearFilters")}
              </Button>
            )}
            
          </div>
        ) : (
          <>
            <div className="bg-background flex flex-col rounded-md border p-3 sm:flex-row sm:items-center">
              {ageLabel}
              <div className="mt-4 mb-1 w-full sm:mt-2 sm:ml-4">
                {ageSlider}
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-[120px] flex-col gap-2">
                <Select
                  value={selectedSex || "all"}
                  onValueChange={updateSexFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("sex.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("sex.all")}</SelectItem>
                    <SelectItem value="f">{t("sex.female")}</SelectItem>
                    <SelectItem value="m">{t("sex.male")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-[300px] flex-1 flex-col gap-2">
                {tagSelect}
              </div>
            </div>

            {hasFilters && (
              <div className="hidden justify-end md:flex">
                <Button
                  variant="ghost"
                  size="xs"
                  className="px-3"
                  onClick={clearFilters}
                >
                  {t("clearFilters")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
