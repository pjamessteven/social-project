"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, type MouseEvent } from "react";
import { CHART_FONT_SIZE, useChartColors } from "./chart-theme";
import { ChartFootnote, ChartMessage, ChartSkeleton } from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useElementWidth } from "./useElementWidth";
import { useTimelines, type PersonTimeline } from "./useTimelines";

const MARGIN = { top: 8, right: 12, bottom: 32, left: 12 };
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 640;

type Lane = PersonTimeline & { transition: number; detransition: number };

/**
 * One thin horizontal line per person, from the age they started
 * transitioning to the age they stopped, sorted by starting age, with dots
 * for puberty blockers, hormones and surgery. Shows the spread of individual
 * lives that a median hides.
 */
export default function TimelineStrip() {
  const t = useTranslations("statsPage.lives");
  const colors = useChartColors();
  const { people, loading, error } = useTimelines();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const lanes = useMemo<Lane[]>(() => {
    if (!people) return [];
    return people
      .filter(
        (person): person is Lane =>
          person.transition != null &&
          person.detransition != null &&
          person.detransition >= person.transition,
      )
      .sort(
        (a, b) =>
          a.transition - b.transition || a.detransition - b.detransition,
      );
  }, [people]);

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !people) return <ChartSkeleton height="h-96" />;
  if (lanes.length === 0) return <ChartMessage>{t("empty")}</ChartMessage>;

  const minAge = Math.max(
    0,
    Math.floor(Math.min(...lanes.map((lane) => lane.transition)) / 5) * 5,
  );
  // Clip the long tail at the 99th percentile so the bulk stays readable.
  const ends = lanes.map((lane) => lane.detransition).sort((a, b) => a - b);
  const maxAge = Math.ceil(ends[Math.floor(ends.length * 0.99)] / 5) * 5;
  const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, lanes.length * 0.6));
  const plotWidth = Math.max(100, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const rowHeight = plotHeight / lanes.length;
  const x = (value: number) =>
    MARGIN.left + ((value - minAge) / Math.max(1, maxAge - minAge)) * plotWidth;
  const y = (index: number) => MARGIN.top + (index + 0.5) * rowHeight;
  const ticks: number[] = [];
  for (let tick = minAge; tick <= maxAge; tick += 5) ticks.push(tick);

  // Only surgery is marked: hormones usually start with transition itself,
  // so their dots would just retrace the start of every line.
  const markers = [
    { key: "topSurgery", color: colors.series[1] },
    { key: "bottomSurgery", color: colors.series[1] },
  ] as const;
  const dotRadius = Math.max(1.2, Math.min(3, rowHeight * 0.9));

  const hovered = hover != null ? lanes[hover] : null;

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor(
      (event.clientY - box.top - MARGIN.top) / rowHeight,
    );
    setHover(index >= 0 && index < lanes.length ? index : null);
  };

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <LegendDot color={colors.series[0]} label={t("legend.transition")} />
        <LegendDot color={colors.series[1]} label={t("legend.surgery")} />
      </div>

      <div ref={ref} className="relative w-full">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={t("ariaLabel", { n: lanes.length })}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          className="block"
        >
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={x(tick)}
              x2={x(tick)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotHeight}
              stroke={colors.grid}
            />
          ))}
          {lanes.map((lane, index) => (
            <line
              key={index}
              x1={x(lane.transition)}
              x2={x(
                Math.min(
                  maxAge,
                  Math.max(lane.detransition, lane.transition + 0.15),
                ),
              )}
              y1={y(index)}
              y2={y(index)}
              stroke={colors.series[0]}
              strokeOpacity={hover == null || hover === index ? 0.55 : 0.25}
              strokeWidth={Math.max(0.6, rowHeight * 0.8)}
            />
          ))}
          {markers.map((marker) =>
            lanes.map((lane, index) => {
              const value = lane[marker.key];
              return value == null || value > maxAge ? null : (
                <circle
                  key={`${marker.key}-${index}`}
                  cx={x(value)}
                  cy={y(index)}
                  r={dotRadius}
                  fill={marker.color}
                />
              );
            }),
          )}
          {hover != null && (
            <rect
              x={MARGIN.left}
              width={plotWidth}
              y={y(hover) - Math.max(2, rowHeight / 2)}
              height={Math.max(4, rowHeight)}
              fill="none"
              stroke={colors.ink}
              strokeWidth={1}
            />
          )}
          {ticks.map((tick) => (
            <text
              key={tick}
              x={x(tick)}
              y={height - 10}
              textAnchor="middle"
              fontSize={CHART_FONT_SIZE}
              fill={colors.muted}
            >
              {tick}
            </text>
          ))}
        </svg>

        {hovered && hover != null && (
          <div
            className="border-border bg-background pointer-events-none absolute z-10 rounded-md border p-3 text-sm shadow-lg"
            style={{
              top: Math.min(y(hover) + 12, height - 120),
              left: Math.min(
                Math.max(0, x(hovered.transition) - 40),
                Math.max(0, width - 240),
              ),
            }}
          >
            <p className="font-medium">
              {hovered.sex === "f"
                ? t("tooltip.woman")
                : hovered.sex === "m"
                  ? t("tooltip.man")
                  : t("tooltip.person")}
            </p>
            {(
              [
                ["firstDysphoria", hovered.firstDysphoria],
                ["transition", hovered.transition],
                ["pubertyBlockers", hovered.pubertyBlockers],
                ["hormones", hovered.hormones],
                ["topSurgery", hovered.topSurgery],
                ["bottomSurgery", hovered.bottomSurgery],
                ["detransition", hovered.detransition],
              ] as const
            )
              .filter(([, value]) => value != null)
              .map(([key, value]) => (
                <p key={key} className="tabular-nums">
                  {t(`tooltip.${key}`, { age: value as number })}
                </p>
              ))}
          </div>
        )}
      </div>

      <ChartFootnote>
        {t("note", { n: lanes.length, total: people?.length ?? 0 })}
      </ChartFootnote>
    </div>
  );
}
