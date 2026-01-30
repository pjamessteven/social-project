"use client";

import { Loader2, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MultiSelect } from "./ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";

interface Tag {
  id: number;
  name: string;
  nameTranslation: string | null;
  userCount: number;
}

function getLocalizedTagName(
  defaultName: string,
  nameTranslation: string | null,
  locale: string
): string {
  if (!nameTranslation) return defaultName;

  try {
    const translations = JSON.parse(nameTranslation) as Record<string, string>;
    return translations[locale] || defaultName;
  } catch {
    return defaultName;
  }
}

interface UsersFiltersProps {}

export default function UsersFilters({}: UsersFiltersProps) {
  const t = useTranslations("stories.filters");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const selectedSex = searchParams.get("sex") || "";
  const selectedTagNames = searchParams
    .getAll("tag")
    .flatMap((tag) => tag.split(",").filter(Boolean));
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [ageRange, setAgeRange] = useState(() => {
    const minAge = searchParams.get("minAge")
      ? parseInt(searchParams.get("minAge")!)
      : 5;
    const maxAge = searchParams.get("maxAge")
      ? parseInt(searchParams.get("maxAge")!)
      : 80;
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

  const updateSexFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value && value !== "all") {
      params.set("sex", value);
    } else {
      params.delete("sex");
    }

    // Reset to page 1 when filters change
    params.delete("page");

    const queryString = params.toString();
    router.push(`/stories${queryString ? `?${queryString}` : ""}`);
  };

  const updateTagsFilter = (selectedDisplayNames: string[]) => {
    const params = new URLSearchParams(searchParams);

    // Clear existing tag params
    params.delete("tag");

    // Find original tag names from display names
    const selectedOriginalNames = selectedDisplayNames
      .map((displayName) => {
        // Extract count suffix if present: "name (count)"
        const match = displayName.match(/^(.+) \(\d+\)$/);
        const displayNameWithoutCount = match ? match[1] : displayName;
        
        // Find the tag with this display name (localized name + count)
        const tag = tags.find((t) => {
          const localizedName = getLocalizedTagName(t.name, t.nameTranslation, locale);
          return `${localizedName} (${t.userCount})` === displayName || localizedName === displayNameWithoutCount;
        });
        return tag?.name;
      })
      .filter((name): name is string => !!name);

    // Add new tags using original names
    if (selectedOriginalNames.length > 0) {
      params.set("tag", selectedOriginalNames.join(","));
    }

    // Reset to page 1 when filters change
    params.delete("page");

    const queryString = params.toString();
    router.push(`/stories${queryString ? `?${queryString}` : ""}`);
  };

  const updateAgeFilter = (newRange: number[]) => {
    setAgeRange(newRange);

    const params = new URLSearchParams(searchParams);
    params.set("minAge", newRange[0].toString());
    params.set("maxAge", newRange[1].toString());
    params.delete("page"); // Reset to first page when filtering

    const queryString = params.toString();
    router.push(`/stories${queryString ? `?${queryString}` : ""}`);
  };

  const updateSearchFilter = useCallback(
    (query: string) => {
      setSearchLoading(true);

      const params = new URLSearchParams(searchParams);

      if (query.trim()) {
        params.set("search", query.trim());
      } else {
        params.delete("search");
      }

      // Reset to page 1 when search changes
      params.delete("page");

      const queryString = params.toString();
      router.push(`/stories${queryString ? `?${queryString}` : ""}`);

      // Reset loading state after a short delay to allow for navigation
      setTimeout(() => setSearchLoading(false), 100);
    },
    [searchParams, router],
  );

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentSearch = searchParams.get("search") || "";
      if (searchQuery !== currentSearch) {
        updateSearchFilter(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, updateSearchFilter, searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchFilter(searchQuery);
  };

  const clearFilters = () => {
    setAgeRange([5, 80]);
    setSearchQuery("");
    setSearchLoading(false);
    router.push("/stories");
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative">
          {searchLoading ? (
            <Loader2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform animate-spin text-gray-400" />
          ) : (
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          )}
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-4 pl-10"
          />
        </div>
      </form>

      {/* Age Range Filter */}
      <div className="bg-background flex flex-col rounded-md border p-3 sm:flex-row sm:items-center">
        <label className="text-sm whitespace-nowrap">
          <span className="font-semibold">{t("ageRange")} </span>{" "}
          {t("ageRangeYears", { min: ageRange[0], max: ageRange[1] })}
        </label>
        <div className="mt-4 mb-1 w-full sm:mt-2 sm:ml-4">
          <Slider
            value={ageRange}
            onValueChange={updateAgeFilter}
            min={5}
            max={80}
            step={1}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        {/* Sex Filter */}
        <div className="flex min-w-[120px] flex-col gap-2">
          <Select value={selectedSex || "all"} onValueChange={updateSexFilter}>
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

        {/* Tag Filter */}
        <div className="flex min-w-[300px] flex-1 flex-col gap-2">
          {loading ? (
            <div className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          ) : (
            <MultiSelect
              options={tags.map((tag) => {
                const localizedName = getLocalizedTagName(tag.name, tag.nameTranslation, locale);
                return `${localizedName} (${tag.userCount})`;
              })}
              selected={selectedTagNames.map((tagName) => {
                const tag = tags.find((t) => t.name === tagName);
                if (!tag) return tagName;
                const localizedName = getLocalizedTagName(tag.name, tag.nameTranslation, locale);
                return `${localizedName} (${tag.userCount})`;
              })}
              onChange={updateTagsFilter}
              placeholder={t("tagsPlaceholder")}
            />
          )}
        </div>

        {/* Clear Filters */}
        {(selectedSex ||
          selectedTagNames.length > 0 ||
          ageRange[0] !== 5 ||
          ageRange[1] !== 80 ||
          searchQuery) && (
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
