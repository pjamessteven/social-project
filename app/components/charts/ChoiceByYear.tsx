"use client";

import { SMALL_SAMPLE_N } from "@/app/lib/stats-math";
import { useTranslations } from "next-intl";
import { useChartColors } from "./chart-theme";
import { ChartFootnote, ChartMessage, ChartSkeleton } from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useFilteredJson } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

interface ByYearResponse {
  key: string;
  options: string[];
  buckets: {
    key: string;
    from: number | null;
    to: number | null;
    n: number;
    shares: Record<string, number>;
  }[];
}

const OTHER = "__other";
/** Light categorical slots (aqua, yellow, magenta) need dark value text. */
const LIGHT_SLOTS = new Set([2, 3, 4]);

export function formatYearBucket(bucket: {
  from: number | null;
  to: number | null;
}): string {
  if (bucket.from == null) return `≤ ${bucket.to}`;
  if (bucket.to == null) return `${bucket.from}+`;
  return `${bucket.from}–${String(bucket.to).slice(-2)}`;
}

/**
 * 100% stacked bars of a choice feature per transition-year cohort. Only the
 * `options` passed in get a colour (in that fixed order, so a colour always
 * means the same option); everything else folds into a grey "Other".
 */
export default function ChoiceByYear({
  featureKey,
  options,
  exclude = [],
}: {
  featureKey: string;
  options: string[];
  exclude?: string[];
}) {
  const t = useTranslations("statsPage.byYear");
  const labels = useFeatureLabels();
  const colors = useChartColors();
  const excludeQuery = exclude.length
    ? `&exclude=${encodeURIComponent(exclude.join(","))}`
    : "";
  const { data, loading, error } = useFilteredJson<ByYearResponse>(
    `/api/features/by-year?key=${encodeURIComponent(featureKey)}${excludeQuery}`,
  );

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-56" />;
  if (!data || data.buckets.every((bucket) => bucket.n === 0)) {
    return <ChartMessage>{t("empty")}</ChartMessage>;
  }

  const segmentsFor = (shares: Record<string, number>) => {
    const named = options.map((option, index) => ({
      key: option,
      share: shares[option] ?? 0,
      color: colors.series[index % colors.series.length],
      darkText: LIGHT_SLOTS.has(index % colors.series.length),
    }));
    const other = Math.max(
      0,
      1 - named.reduce((sum, segment) => sum + segment.share, 0),
    );
    return [
      ...named,
      { key: OTHER, share: other, color: colors.neutral, darkText: true },
    ];
  };

  const labelFor = (key: string) =>
    key === OTHER ? t("other") : labels.option(key);

  return (
    <div>
      <div className="text-muted-foreground mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {options.map((option, index) => (
          <LegendDot
            key={option}
            color={colors.series[index % colors.series.length]}
            label={labelFor(option)}
          />
        ))}
        <LegendDot color={colors.neutral} label={t("other")} />
      </div>

      <ul className="space-y-3">
        {data.buckets
          .filter((bucket) => bucket.n > 0)
          .map((bucket) => {
            const small = bucket.n < SMALL_SAMPLE_N;
            return (
              <li
                key={bucket.key}
                className={`grid grid-cols-[5.5rem_1fr] items-center gap-4 ${
                  small ? "opacity-60" : ""
                }`}
              >
                <span className="text-base tabular-nums">
                  {formatYearBucket(bucket)}
                  <span className="text-muted-foreground block text-sm">
                    {t("n", { n: bucket.n })}
                  </span>
                </span>
                <span className="flex h-9 w-full gap-0.5 overflow-hidden rounded">
                  {segmentsFor(bucket.shares).map((segment) =>
                    segment.share > 0.002 ? (
                      <span
                        key={segment.key}
                        className={`flex items-center justify-center text-sm font-medium tabular-nums ${
                          segment.darkText ? "text-slate-900" : "text-white"
                        }`}
                        style={{
                          width: `${segment.share * 100}%`,
                          background: segment.color,
                        }}
                        title={`${formatYearBucket(bucket)} · ${labelFor(segment.key)}: ${Math.round(segment.share * 100)}%`}
                      >
                        {segment.share >= 0.1
                          ? `${Math.round(segment.share * 100)}%`
                          : ""}
                      </span>
                    ) : null,
                  )}
                </span>
              </li>
            );
          })}
      </ul>
      <ChartFootnote>
        <span className="mt-4 block">{t("note")}</span>
      </ChartFootnote>
    </div>
  );
}
