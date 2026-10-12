"use client";

import { useTranslations } from "next-intl";
import { ChartMessage, ChartSkeleton } from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useFilteredJson, useSexFiltered } from "./useFeatureData";

interface ChoiceBySexResponse {
  key: string;
  groups: Record<"f" | "m", { n: number; soft: Record<string, number> }>;
}

/**
 * An ordered choice (e.g. supportive -> opposed) as 100% stacked bars for
 * everyone, women and men, keeping the scale's order so the bars read left
 * to right. Options outside `order` (e.g. "not addressed") are left out and
 * shares are re-based on the rest.
 */
export default function OrdinalChoiceBars({
  featureKey,
  order,
  colors,
  labelOf,
  darkText = [],
}: {
  featureKey: string;
  order: string[];
  colors: string[];
  labelOf: (option: string) => string;
  /** Options whose segment colour needs dark value text. */
  darkText?: string[];
}) {
  const t = useTranslations("statsPage.ordinal");
  const sexFiltered = useSexFiltered();
  const { data, loading, error } = useFilteredJson<ChoiceBySexResponse>(
    `/api/features/choice-by-sex?key=${encodeURIComponent(featureKey)}`,
  );

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-48" />;
  if (!data) return null;

  const { f, m } = data.groups;
  const combine = (...groups: { soft: Record<string, number> }[]) => {
    const soft: Record<string, number> = {};
    for (const group of groups) {
      for (const option of order) {
        soft[option] = (soft[option] ?? 0) + (group.soft[option] ?? 0);
      }
    }
    const total = order.reduce((sum, option) => sum + soft[option], 0);
    return { soft, total };
  };

  const rows = [
    { key: "all", label: t("all"), ...combine(f, m) },
    ...(sexFiltered
      ? []
      : [
          { key: "f", label: t("women"), ...combine(f) },
          { key: "m", label: t("men"), ...combine(m) },
        ]),
  ].filter((row) => row.total > 0);

  if (rows.length === 0) return <ChartMessage>{t("empty")}</ChartMessage>;

  return (
    <div className="space-y-5">
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {order.map((option, index) => (
          <LegendDot
            key={option}
            color={colors[index]}
            label={labelOf(option)}
          />
        ))}
      </div>
      <ul className="space-y-4">
        {rows.map((row) => (
          <li
            key={row.key}
            className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-4"
          >
            <span className="text-base">
              {row.label}
              <span className="text-muted-foreground block text-sm">
                n ≈ {Math.round(row.total)}
              </span>
            </span>
            <span className="flex h-9 w-full gap-0.5 overflow-hidden rounded">
              {order.map((option, index) => {
                const share = row.soft[option] / row.total;
                if (share <= 0.002) return null;
                return (
                  <span
                    key={option}
                    className={`flex items-center justify-center text-sm font-medium tabular-nums ${
                      darkText.includes(option)
                        ? "text-slate-900"
                        : "text-white"
                    }`}
                    style={{
                      width: `${share * 100}%`,
                      background: colors[index],
                    }}
                    title={`${row.label} · ${labelOf(option)}: ${Math.round(share * 100)}%`}
                  >
                    {share >= 0.08 ? `${Math.round(share * 100)}%` : ""}
                  </span>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
