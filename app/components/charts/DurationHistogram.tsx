"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, useChartColors } from "./chart-theme";
import type { DurationGroup } from "./DurationSection";
import { LegendDot } from "./PrevalenceRows";
import { useElementWidth } from "./useElementWidth";

/** Below this chart width the bucket labels collide, so they're tilted. */
const NARROW_WIDTH = 520;

/** Single years up to 9, then 10–14 and 15+, so the long tail stays visible. */
const BUCKETS = [
  ...Array.from({ length: 10 }, (_, year) => ({ from: year, to: year })),
  { from: 10, to: 14 },
  { from: 15, to: Infinity },
];

type Bucket = (typeof BUCKETS)[number];

/**
 * Years from starting transition to stopping, as a share of each group, one
 * bar per group side by side.
 */
export default function DurationHistogram({
  groups,
}: {
  groups: DurationGroup[];
}) {
  const t = useTranslations("statsPage.duration");
  const colors = useChartColors();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const narrow = width < NARROW_WIDTH;

  const bucketTitle = (bucket: Bucket) =>
    bucket.to === Infinity
      ? t("bucketTitlePlus", { years: bucket.from })
      : bucket.from === bucket.to
        ? t("bucketTitle", { years: bucket.from })
        : t("bucketTitleRange", { from: bucket.from, to: bucket.to });

  const chartData = useMemo(() => {
    const bucketLabel = (bucket: Bucket) =>
      bucket.from === 0
        ? t("bucketUnder1")
        : bucket.to === Infinity
          ? `${bucket.from}+`
          : bucket.from === bucket.to
            ? String(bucket.from)
            : `${bucket.from}–${bucket.to}`;

    return BUCKETS.map((bucket, index) => {
      const row: Record<string, number | string> = {
        index,
        label: bucketLabel(bucket),
      };
      for (const group of groups) {
        const count = group.values.filter(
          (value) => value >= bucket.from && value <= bucket.to,
        ).length;
        row[group.key] =
          group.values.length > 0 ? (count / group.values.length) * 100 : 0;
        row[`${group.key}__count`] = count;
      }
      return row;
    });
  }, [groups, t]);

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as Record<string, number>;
    return (
      <div className="border-border bg-background space-y-1 rounded-md border p-3 text-sm shadow-lg">
        <p className="font-medium">{bucketTitle(BUCKETS[row.index])}</p>
        {groups.map((group) => (
          <p key={group.key} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: group.color }}
            />
            {group.label}:{" "}
            <span className="font-medium tabular-nums">
              {Math.round(row[group.key])}%
            </span>
            <span className="text-muted-foreground tabular-nums">
              ({row[`${group.key}__count`]} / {group.values.length})
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {groups.map((group) => (
          <LegendDot key={group.key} color={group.color} label={group.label} />
        ))}
      </div>
      <div ref={ref} className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 20 }}
            barCategoryGap="18%"
            barGap={2}
          >
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{
                ...AXIS_TICK,
                fill: colors.muted,
                ...(narrow && { angle: -45, textAnchor: "end" }),
              }}
              height={narrow ? 48 : 30}
              axisLine={{ stroke: colors.axis }}
              tickLine={false}
              label={{
                value: t("yearsAxis"),
                position: "insideBottom",
                offset: narrow ? -16 : -12,
                fontSize: AXIS_TICK.fontSize,
                fill: colors.muted,
              }}
            />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              tick={{ ...AXIS_TICK, fill: colors.muted }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              content={renderTooltip}
              cursor={{ fill: colors.grid, fillOpacity: 0.5 }}
            />
            {groups.map((group) => (
              <Bar
                key={group.key}
                dataKey={group.key}
                fill={group.color}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
