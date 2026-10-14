"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

export interface FeatureSummaryItem {
  key: string;
  label: string;
  group: string;
  tier: string;
  kind: string;
  tagName: string | null;
  threshold: number;
  scoreLevels: number | null;
  n: number;
  nAbove: number;
  nUncertain: number;
  bySex: {
    f: { n: number; above: number };
    m: { n: number; above: number };
  };
  meanNoul: number | null;
  meanScore: number | null;
  confidence: number | null;
  modalChoice: string | null;
  modalCount: number | null;
  coverage: number;
  prevalence: number | null;
}

export interface FeatureSummaryResponse {
  cohort: number;
  features: FeatureSummaryItem[];
}

export interface NoulBucket {
  from: number;
  to: number;
  count: number;
}

export interface ChoiceOption {
  key: string;
  hard: number;
  soft: number;
  description: string | null;
}

export interface ScoreBin {
  from: number;
  to: number;
  count: number;
}

export interface RelatedFeature {
  key: string;
  label: string;
  tier: string;
  targetN: number;
  rate: number;
  lift: number | null;
}

export interface FeatureDetailResponse {
  feature: {
    key: string;
    label: string;
    group: string;
    tier: string;
    kind: string;
    tagName: string | null;
    tagType: string | null;
    threshold: number;
    question: { instructions?: string; criteria?: unknown };
    choiceTagMap: Record<string, string> | null;
  };
  cohort: number;
  n: number;
  coverage: number;
  noul?: {
    buckets: NoulBucket[];
    mean: number | null;
    median: number | null;
    nAbove: number;
    nUncertain: number;
    nBelow: number;
    nValues: number;
  };
  choice?: {
    options: ChoiceOption[];
    nChoice: number;
    nWithProbabilities: number;
  };
  score?: {
    levels: string[];
    min: number;
    max: number;
    bins: ScoreBin[];
    mean: number | null;
    median: number | null;
    nValues: number;
  };
  confidence?: { mean: number; median: number | null; n: number };
  related: RelatedFeature[];
}

type ReadonlyParams = { get(name: string): string | null };

/** Shared stats filters, matching /api/features/* query params. */
export function buildFeatureParams(params: ReadonlyParams): string {
  const query = new URLSearchParams();
  const minAge = params.get("minAge");
  const maxAge = params.get("maxAge");
  const sex = params.get("sex");
  const tag = params.get("tag");
  if (minAge) query.set("minAge", minAge);
  if (maxAge) query.set("maxAge", maxAge);
  if (sex) query.set("sex", sex);
  if (tag) query.set("tag", tag);
  return query.toString();
}

export interface FilterOverrides {
  sex?: string;
  tag?: string;
}

/**
 * Filters set by a section's own filter bar (see StatsFilters'
 * FilteredSection). They replace the page's query-string filters for every
 * chart inside that section.
 */
export const SectionFiltersContext = createContext<FilterOverrides | null>(
  null,
);

/**
 * The /api/features/* query string for this chart: the page filters, then
 * the enclosing section's filters, then `overrides` (an empty string clears
 * that filter).
 */
export function useFeatureQuery(overrides?: FilterOverrides): string {
  const searchParams = useSearchParams();
  const section = useContext(SectionFiltersContext);
  const params = new URLSearchParams(buildFeatureParams(searchParams));
  for (const layer of [section, overrides]) {
    for (const [key, value] of Object.entries(layer ?? {})) {
      if (value === undefined) continue;
      if (value) params.set(key, value);
      else params.delete(key);
    }
  }
  return params.toString();
}

/**
 * Feature summary for the page filters. `overrides` replaces individual
 * filters for one chart (an empty string clears that filter).
 */
export function useFeatureSummary(overrides?: FilterOverrides) {
  const query = useFeatureQuery(overrides);
  const [data, setData] = useState<FeatureSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/features/summary?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as FeatureSummaryResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (
          cancelled ||
          (err instanceof DOMException && err.name === "AbortError")
        )
          return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query]);

  return { data, loading, error };
}

export function useFeatureDetail(
  key: string | null,
  threshold?: number | null,
) {
  const query = useFeatureQuery();
  const [data, setData] = useState<FeatureDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setData(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    const thresholdQuery = threshold != null ? `&threshold=${threshold}` : "";
    fetch(
      `/api/features/${encodeURIComponent(key)}?${query}${thresholdQuery}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as FeatureDetailResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (
          cancelled ||
          (err instanceof DOMException && err.name === "AbortError")
        )
          return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, query, threshold]);

  return { data, loading, error };
}

/** "social_role_discomfort" -> "Social role discomfort" */
export function prettifyKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Fetches a /api/features-style endpoint with the current stats filters
 * appended. `path` may already carry its own query (e.g. "?view=regret").
 * Pass null to skip fetching.
 */
export function useFilteredJson<T>(path: string | null) {
  const query = useFeatureQuery();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path != null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    const separator = path.includes("?") ? "&" : "?";
    fetch(`${path}${query ? `${separator}${query}` : ""}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as T;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (
          cancelled ||
          (err instanceof DOMException && err.name === "AbortError")
        )
          return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [path, query]);

  return { data, loading, error };
}

/** True when the stats filters already restrict the cohort to one sex. */
export function useSexFiltered(): boolean {
  const sex = new URLSearchParams(useFeatureQuery()).get("sex");
  return sex === "m" || sex === "f";
}
