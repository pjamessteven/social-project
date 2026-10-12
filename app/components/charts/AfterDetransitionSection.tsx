"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useChartColors } from "./chart-theme";
import { ChartSkeleton, ROW_GROUP_TITLE } from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { buildFeatureParams } from "./useFeatureData";

interface Panel {
  key: string;
  label: string;
  criteria: string[];
  levels: number[];
  n: number;
}

interface AfterResponse {
  cohort: number;
  panels: Panel[];
}

const LEVEL_KEYS = ["muchWorse", "worse", "same", "better", "muchBetter"];

/**
 * Mental health, quality of life and family relationships after
 * detransitioning, as diverging better/same/worse composition bars.
 */
export default function AfterDetransitionSection() {
  const t = useTranslations("statsPage.after");
  const colors = useChartColors();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AfterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = buildFeatureParams(searchParams);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/features/after-detransition?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AfterResponse;
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
  }, [params]);

  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("error")}: {error}
      </p>
    );
  }

  if (loading && !data) {
    return <ChartSkeleton height="h-56" />;
  }

  const panels = data?.panels ?? [];
  if (panels.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  // Diverging bars centred on "about the same": worse to the left, better
  // to the right, with the neutral share split across the centre line.
  const palette = [
    colors.negative,
    colors.negativeSoft,
    colors.midpoint,
    colors.positiveSoft,
    colors.positive,
  ];

  const mental = panels.find(
    (panel) => panel.key === "mh_change_after_detransition",
  );
  const shareOf = (panel: Panel, levels: number[]) =>
    panel.n > 0
      ? Math.round(
          (levels.reduce((sum, level) => sum + panel.levels[level], 0) /
            panel.n) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {mental && mental.n > 0 && (
        <p className="text-base">
          {t("headline", {
            better: shareOf(mental, [3, 4]),
            worse: shareOf(mental, [0, 1]),
            n: mental.n,
          })}
        </p>
      )}
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {LEVEL_KEYS.map((key, index) => (
          <LegendDot
            key={key}
            color={palette[index]}
            label={t(`levels.${key}`)}
          />
        ))}
      </div>

      <ul className="space-y-5">
        {panels.map((panel) => {
          const shares = panel.levels.map((count) =>
            panel.n > 0 ? count / panel.n : 0,
          );
          const better = shares[3] + shares[4];
          const worse = shares[0] + shares[1];
          const panelLabel = t.has(`panels.${panel.key}`)
            ? t(`panels.${panel.key}`)
            : panel.label;
          // Segment order from the centre outwards on each side.
          const left = [
            { index: 2, share: shares[2] / 2 },
            { index: 1, share: shares[1] },
            { index: 0, share: shares[0] },
          ];
          const right = [
            { index: 2, share: shares[2] / 2 },
            { index: 3, share: shares[3] },
            { index: 4, share: shares[4] },
          ];
          const segments = (side: typeof left, direction: "left" | "right") => {
            let offset = 0;
            return side.map((segment) => {
              const start = offset;
              offset += segment.share;
              return (
                <span
                  key={`${direction}-${segment.index}`}
                  className="absolute top-0 bottom-0"
                  style={{
                    [direction === "left" ? "right" : "left"]:
                      `${50 + start * 50}%`,
                    width: `${segment.share * 50}%`,
                    background: palette[segment.index],
                  }}
                  title={`${t(`levels.${LEVEL_KEYS[segment.index]}`)}: ${Math.round(shares[segment.index] * 100)}%`}
                />
              );
            });
          };
          return (
            <li key={panel.key}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                <span className={ROW_GROUP_TITLE}>{panelLabel}</span>
                <span className="text-muted-foreground text-sm">
                  {t("count", { n: panel.n })}
                </span>
              </div>
              <div className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-3">
                <span className="text-right text-base tabular-nums">
                  {Math.round(worse * 100)}%
                </span>
                <span className="relative block h-8">
                  {segments(left, "left")}
                  {segments(right, "right")}
                  <span
                    className="absolute top-[-4px] bottom-[-4px] left-1/2 w-px"
                    style={{ background: colors.ink }}
                  />
                </span>
                <span className="text-base tabular-nums">
                  {Math.round(better * 100)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="text-muted-foreground grid grid-cols-[3.5rem_1fr_3.5rem] gap-3 text-sm">
        <span />
        <span className="flex justify-between">
          <span>← {t("worseSide")}</span>
          <span>{t("betterSide")} →</span>
        </span>
        <span />
      </div>

      <p className="text-muted-foreground text-sm">
        {t("basedOn", { cohort: data?.cohort ?? 0 })}
      </p>
    </div>
  );
}
