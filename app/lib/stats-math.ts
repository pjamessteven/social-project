/**
 * Small statistics helpers shared by the /stats charts. Client-safe.
 */

/** Below this many answers a share is flagged as a small sample. */
export const SMALL_SAMPLE_N = 30;

export interface Interval {
  low: number;
  high: number;
}

/**
 * 95% Wilson score interval for a proportion k / n. Unlike the normal
 * approximation it stays inside [0, 1] and behaves for small n and rare
 * features, which is most of what the stats page shows once filtered.
 */
export function wilson(k: number, n: number, z = 1.96): Interval {
  if (n <= 0) return { low: 0, high: 0 };
  const p = k / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;
  return {
    low: Math.max(0, centre - margin),
    high: Math.min(1, centre + margin),
  };
}

/**
 * Risk ratio between two groups with a Haldane (+0.5) correction so empty
 * cells stay finite, plus its 95% interval on the log scale.
 */
export function riskRatio(
  kA: number,
  nA: number,
  kB: number,
  nB: number,
): { ratio: number; low: number; high: number } | null {
  if (nA <= 0 || nB <= 0) return null;
  const a = kA + 0.5;
  const b = kB + 0.5;
  const ratio = a / (nA + 0.5) / (b / (nB + 0.5));
  const se = Math.sqrt(1 / a - 1 / (nA + 0.5) + 1 / b - 1 / (nB + 0.5));
  const log = Math.log(ratio);
  return {
    ratio,
    low: Math.exp(log - 1.96 * se),
    high: Math.exp(log + 1.96 * se),
  };
}

/** Rounds a 0-1 share up to a tidy axis maximum (10% steps, 100% cap). */
export function niceShareMax(maxShare: number): number {
  if (maxShare <= 0) return 0.1;
  return Math.min(1, Math.ceil((maxShare + 0.02) * 10) / 10);
}

export function formatRatio(ratio: number): string {
  if (ratio > 20) return ">20×";
  if (ratio < 0.05) return "<0.05×";
  if (ratio >= 10) return `${Math.round(ratio)}×`;
  return `${ratio.toFixed(1)}×`;
}

/** Linear-interpolated quantile (0-1) of an ascending-sorted array. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const position = (sorted.length - 1) * q;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}

export interface SpreadSummary {
  n: number;
  /** 25th percentile: the middle half of values lies between p25 and p75. */
  p25: number;
  median: number;
  p75: number;
}

/** Median and interquartile range, or null when there are no values. */
export function spread(values: number[]): SpreadSummary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
  };
}

/** Longest believable time in transition; longer is an extraction error. */
const MAX_TRANSITION_YEARS = 40;

/**
 * Years from transition to detransition for one timeline: the year
 * difference when both years are known, the age difference otherwise, or
 * null when neither is usable.
 */
export function transitionYears(timeline: {
  transitionYear: unknown;
  detransitionYear: unknown;
  transitionAge: number | null;
  detransitionAge: number | null;
}): number | null {
  let years: number | null = null;
  if (
    typeof timeline.transitionYear === "number" &&
    typeof timeline.detransitionYear === "number"
  ) {
    years = timeline.detransitionYear - timeline.transitionYear;
  } else if (
    timeline.transitionAge != null &&
    timeline.detransitionAge != null
  ) {
    years = timeline.detransitionAge - timeline.transitionAge;
  }
  return years != null && years >= 0 && years <= MAX_TRANSITION_YEARS
    ? years
    : null;
}
