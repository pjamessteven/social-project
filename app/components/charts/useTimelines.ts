"use client";

import { useMemo } from "react";
import { useFilteredJson } from "./useFeatureData";

export interface PersonTimeline {
  sex: "f" | "m" | null;
  firstDysphoria: number | null;
  pubertyBlockers: number | null;
  hormones: number | null;
  transition: number | null;
  topSurgery: number | null;
  bottomSurgery: number | null;
  detransition: number | null;
  /** Years from transition to detransition. */
  years: number | null;
}

interface TimelinesResponse {
  columns: (keyof PersonTimeline)[];
  rows: (string | number | null)[][];
}

/** Anonymous per-person milestone ages for the current stats filters. */
export function useTimelines() {
  const { data, loading, error } = useFilteredJson<TimelinesResponse>(
    "/api/features/timelines",
  );
  const people = useMemo<PersonTimeline[] | null>(() => {
    if (!data) return null;
    return data.rows.map(
      (row) =>
        Object.fromEntries(
          data.columns.map((column, index) => [column, row[index]]),
        ) as unknown as PersonTimeline,
    );
  }, [data]);
  return { people, loading, error };
}
