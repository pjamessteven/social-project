"use client";

import type { SpreadSummary } from "@/app/lib/stats-math";
import { SMALL_SAMPLE_N } from "@/app/lib/stats-math";
import { useTranslations } from "next-intl";
import { useChartColors } from "./chart-theme";

export interface DurationRange {
  key: string;
  label: string;
  summary: SpreadSummary | null;
}

const formatYears = (years: number) => String(Math.round(years * 10) / 10);

/**
 * One row per group: a bar over the middle half of durations (25th to 75th
 * percentile) with a dot at the median, on a shared years axis.
 */
export default function DurationRanges({ rows }: { rows: DurationRange[] }) {
  const t = useTranslations("statsPage.duration");
  const colors = useChartColors();
  const shown = rows.filter((row) => row.summary && row.summary.n > 0);

  // Whole axis in even years, at least 0–10.
  const maxYears = Math.max(
    10,
    Math.ceil(Math.max(...shown.map((row) => row.summary!.p75)) / 2) * 2 + 2,
  );
  const ticks = Array.from(
    { length: maxYears / 2 + 1 },
    (_, index) => index * 2,
  );
  const position = (years: number) => `${(years / maxYears) * 100}%`;

  return (
    <div className="space-y-5">
      <ul className="space-y-5">
        {shown.map(({ key, label, summary }) => {
          const { n, p25, median, p75 } = summary!;
          return (
            <li
              key={key}
              className="grid gap-x-6 gap-y-2 sm:grid-cols-[15rem_1fr] sm:items-center"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {t("rangeSummary", {
                    median: formatYears(median),
                    low: formatYears(p25),
                    high: formatYears(p75),
                  })}
                </p>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {t("rangeCount", { n })}
                  {n < SMALL_SAMPLE_N && ` · ${t("smallSample")}`}
                </p>
              </div>
              <div
                className="relative h-8"
                role="img"
                aria-label={`${label}: ${t("rangeSummary", {
                  median: formatYears(median),
                  low: formatYears(p25),
                  high: formatYears(p75),
                })}`}
              >
                {ticks.map((tick) => (
                  <span
                    key={tick}
                    className="absolute inset-y-0 w-px"
                    style={{ left: position(tick), background: colors.grid }}
                  />
                ))}
                <span
                  className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full"
                  style={{
                    left: position(p25),
                    width: `max(0.75rem, ${((p75 - p25) / maxYears) * 100}%)`,
                    background: colors.series[6],
                    opacity: 0.35,
                  }}
                />
                <span
                  // Ring in the card colour (CARD_SURFACE) so the dot reads
                  // on top of the bar.
                  className="dark:border-secondary absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                  style={{
                    left: position(median),
                    background: colors.series[6],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {/* Axis under the bars, aligned with the bar column from sm up. */}
      <div className="sm:grid sm:grid-cols-[15rem_1fr] sm:gap-x-6">
        <div className="hidden sm:block" />
        <div>
          <div className="relative h-5">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="text-muted-foreground absolute -translate-x-1/2 text-sm tabular-nums"
                style={{ left: position(tick) }}
              >
                {tick}
              </span>
            ))}
          </div>
          <p className="text-muted-foreground mt-1 text-center text-sm">
            {t("yearsAxis")}
          </p>
        </div>
      </div>
    </div>
  );
}
