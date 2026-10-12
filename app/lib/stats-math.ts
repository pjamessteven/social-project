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
