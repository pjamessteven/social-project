"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, useChartColors } from "./chart-theme";
import { ChartFootnote, ChartMessage, ChartSkeleton } from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useSexFiltered } from "./useFeatureData";
import { useTimelines } from "./useTimelines";

const MAX_YEARS = 15;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Cumulative share of people who had stopped within N years of starting
 * transition, for women and men separately. Everyone here eventually
 * stopped, so this is the distribution of time spent in transition — not a
 * rate of detransition among everyone who transitions.
 */
export default function DurationCurve() {
  const t = useTranslations("statsPage.duration");
  const colors = useChartColors();
  const sexFiltered = useSexFiltered();
  const { people, loading, error } = useTimelines();

  const groups = useMemo(() => {
    if (!people) return [];
    const years = (filter: (sex: string | null) => boolean) =>
      people
        .filter((person) => person.years != null && filter(person.sex))
        .map((person) => person.years as number);
    return sexFiltered
      ? [
          {
            key: "all",
            label: t("all"),
            color: colors.series[0],
            values: years(() => true),
          },
        ]
      : [
          {
            key: "f",
            label: t("women"),
            color: colors.women,
            values: years((sex) => sex === "f"),
          },
          {
            key: "m",
            label: t("men"),
            color: colors.men,
            values: years((sex) => sex === "m"),
          },
        ].filter((group) => group.values.length > 0);
  }, [people, sexFiltered, colors, t]);

  const chartData = useMemo(() => {
    const maxYear = Math.min(
      MAX_YEARS,
      Math.max(5, ...groups.flatMap((group) => group.values)),
    );
    return Array.from({ length: maxYear + 1 }, (_, year) => {
      const point: Record<string, number> = { year };
      for (const group of groups) {
        const within = group.values.filter((value) => value <= year).length;
        point[group.key] =
          group.values.length > 0
            ? Math.round((within / group.values.length) * 1000) / 10
            : 0;
      }
      return point;
    });
  }, [groups]);

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !people) return <ChartSkeleton height="h-80" />;
  if (groups.length === 0) return <ChartMessage>{t("empty")}</ChartMessage>;

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="border-border bg-background space-y-1 rounded-md border p-3 text-sm shadow-lg">
        <p className="font-medium">{t("tooltipTitle", { years: label })}</p>
        {groups.map((group) => {
          const entry = payload.find((item: any) => item.dataKey === group.key);
          return entry ? (
            <p key={group.key} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: group.color }}
              />
              {group.label}:{" "}
              <span className="font-medium tabular-nums">
                {Math.round(entry.value)}%
              </span>
            </p>
          ) : null;
        })}
      </div>
    );
  };

  const all = groups.flatMap((group) => group.values);
  const within = (years: number) =>
    Math.round(
      (all.filter((value) => value <= years).length / all.length) * 100,
    );

  return (
    <div className="space-y-4">
      <p className="text-base">
        {t("headline", {
          one: within(1),
          five: within(5),
          median: median(all) ?? 0,
          n: all.length,
        })}
      </p>
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {groups.map((group) => (
          <LegendDot
            key={group.key}
            color={group.color}
            label={t("legend", {
              label: group.label,
              median: median(group.values) ?? 0,
              n: group.values.length,
            })}
          />
        ))}
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 20 }}
          >
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="year"
              tick={{ ...AXIS_TICK, fill: colors.muted }}
              axisLine={{ stroke: colors.axis }}
              tickLine={false}
              label={{
                value: t("xAxis"),
                position: "insideBottom",
                offset: -12,
                fontSize: AXIS_TICK.fontSize,
                fill: colors.muted,
              }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ ...AXIS_TICK, fill: colors.muted }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={renderTooltip} />
            {groups.map((group) => (
              <Line
                key={group.key}
                type="stepAfter"
                dataKey={group.key}
                stroke={group.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartFootnote>{t("note")}</ChartFootnote>
    </div>
  );
}
