"use client";

import { useEffect, useState } from "react";
import { useFeatureQuery, type FilterOverrides } from "./useFeatureData";

export interface Milestone {
  key: string;
  n: number;
  median: number | null;
  min: number | null;
  max: number | null;
  counts: { age: number; count: number }[];
}

export interface JourneyResponse {
  cohort: number;
  milestones: Milestone[];
  duration: {
    n: number;
    median: number | null;
    min: number | null;
    max: number | null;
    counts: { age: number; count: number }[];
  } | null;
}

export interface JourneyState {
  data: JourneyResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fixed age axis for the Ages section, so switching filters never rescales
 * it. Covers first dysphoria from birth; under 1% of any milestone is later.
 */
export const AGE_DOMAIN: [number, number] = [0, 45];
export const AGE_TICKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];

/** Milestone ages for the active filters (see useFeatureQuery). */
export function useJourney(overrides?: FilterOverrides): JourneyState {
  const query = useFeatureQuery(overrides);
  const [data, setData] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/features/journey?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as JourneyResponse;
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
