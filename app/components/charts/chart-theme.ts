"use client";

import { useDarkMode } from "./useDarkMode";

/**
 * Shared chart palette for /stats. Categorical slots are assigned in this
 * fixed order and follow the entity (women are always slot 1, men slot 2),
 * never the rank. Light and dark steps are validated separately.
 */
const CATEGORICAL = {
  light: [
    "#2a78d6", // blue
    "#eb6834", // orange
    "#1baf7a", // aqua
    "#eda100", // yellow
    "#e87ba4", // magenta
    "#008300", // green
    "#4a3aa7", // violet
    "#e34948", // red
  ],
  dark: [
    "#3987e5",
    "#d95926",
    "#199e70",
    "#c98500",
    "#d55181",
    "#008300",
    "#9085e9",
    "#e66767",
  ],
} as const;

const CHROME = {
  light: {
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    muted: "#898781",
    neutral: "#c3c2b7",
    ink: "#52514e",
    // Diverging blue <-> red with a grey midpoint.
    negative: "#d03b3b",
    negativeSoft: "#ec9a9a",
    positive: "#2a78d6",
    positiveSoft: "#86b6ef",
    midpoint: "#d9d8d2",
  },
  dark: {
    grid: "#2c2c2a",
    axis: "#383835",
    muted: "#898781",
    neutral: "#5a5955",
    ink: "#c3c2b7",
    negative: "#e66767",
    negativeSoft: "#9c4a4a",
    positive: "#3987e5",
    positiveSoft: "#1c5cab",
    midpoint: "#4a4a46",
  },
} as const;

/** Minimum on-chart text size (px) — axis ticks, cell values, labels. */
export const CHART_FONT_SIZE = 13;
export const AXIS_TICK = { fontSize: CHART_FONT_SIZE } as const;

export type ChartColors = {
  isDark: boolean;
  series: readonly string[];
  women: string;
  men: string;
  tier: Record<string, string>;
} & (typeof CHROME)["light" | "dark"];

export function useChartColors(): ChartColors {
  const isDark = useDarkMode();
  const series = isDark ? CATEGORICAL.dark : CATEGORICAL.light;
  const chrome = isDark ? CHROME.dark : CHROME.light;
  return {
    ...chrome,
    isDark,
    series,
    women: series[0],
    men: series[1],
    tier: { cause: series[0], process: series[1], outcome: series[2] },
  };
}
