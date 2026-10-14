"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, useChartColors } from "./chart-theme";
import {
  ChartBlock,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useFilteredJson } from "./useFeatureData";

interface AgePair {
  transitionAge: number;
  detransitionAge: number;
  sex: "f" | "m";
  count: number;
}

const SEXES = ["f", "m"] as const;

/** The axes never start above 10 or end below 50, so filters rarely rescale. */
const AXIS_FLOOR = 10;
const AXIS_CEILING = 50;

/**
 * Dot radius and opacity grow linearly with the group's count (relative to
 * the largest group of either sex), so clusters stand out.
 */
const DOT_RADIUS: [number, number] = [2.5, 22];
const DOT_OPACITY: [number, number] = [0.25, 0.9];

/**
 * Age at transition (x) against age at detransition (y), one dot per
 * (ages, sex) group, larger and more opaque the more stories share it. Distance above the
 * dashed diagonal is the time spent transitioned.
 */
export default function TransitionDurationChart() {
  const t = useTranslations("charts.transitionDuration");
  const colors = useChartColors();
  const { data, loading, error } = useFilteredJson<{ pairs: AgePair[] }>(
    "/api/features/age-pairs",
  );

  const { bySex, total, domain, ticks, maxCount } = useMemo(() => {
    const pairs = data?.pairs ?? [];
    const summary = SEXES.map((sex) => {
      const points = pairs.filter((pair) => pair.sex === sex);
      const n = points.reduce((sum, pair) => sum + pair.count, 0);
      const years = points.reduce(
        (sum, pair) =>
          sum + (pair.detransitionAge - pair.transitionAge) * pair.count,
        0,
      );
      return { sex, points, n, mean: n > 0 ? years / n : null };
    });
    const ages = pairs.flatMap((pair) => [
      pair.transitionAge,
      pair.detransitionAge,
    ]);
    const low = Math.min(AXIS_FLOOR, Math.floor(Math.min(...ages) / 5) * 5);
    const high = Math.max(AXIS_CEILING, Math.ceil(Math.max(...ages) / 5) * 5);
    const axisTicks: number[] = [];
    for (let age = low; age <= high; age += 5) axisTicks.push(age);
    return {
      bySex: summary,
      total: summary.reduce((sum, group) => sum + group.n, 0),
      domain: [low, high] as [number, number],
      ticks: axisTicks,
      maxCount: Math.max(1, ...pairs.map((pair) => pair.count)),
    };
  }, [data]);

  const colorOf = (sex: "f" | "m") => (sex === "f" ? colors.women : colors.men);
  const labelOf = (sex: "f" | "m") => (sex === "f" ? t("female") : t("male"));

  const renderDot = (props: any) => {
    const { cx, cy, payload } = props as {
      cx?: number;
      cy?: number;
      payload?: AgePair;
    };
    if (cx == null || cy == null || !payload) return <g />;
    const share = maxCount > 1 ? (payload.count - 1) / (maxCount - 1) : 1;
    const lerp = ([from, to]: [number, number]) => from + share * (to - from);
    const color = colorOf(payload.sex);
    return (
      <circle
        cx={cx}
        cy={cy}
        r={lerp(DOT_RADIUS)}
        fill={color}
        fillOpacity={lerp(DOT_OPACITY)}
        stroke={color}
        strokeWidth={1}
      />
    );
  };

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as AgePair;
    return (
      <div className="border-border bg-background space-y-1 rounded-md border p-3 text-sm shadow-lg">
        <p className="flex items-center gap-2 font-medium">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: colorOf(point.sex) }}
          />
          {labelOf(point.sex)}
        </p>
        <p>
          {t("tooltip.transitionAge")}:{" "}
          <span className="font-medium tabular-nums">
            {point.transitionAge}
          </span>
        </p>
        <p>
          {t("tooltip.detransitionAge")}:{" "}
          <span className="font-medium tabular-nums">
            {point.detransitionAge}
          </span>
        </p>
        <p>
          {t("tooltip.duration")}:{" "}
          <span className="font-medium tabular-nums">
            {point.detransitionAge - point.transitionAge} {t("tooltip.years")}
          </span>
        </p>
        <p className="text-muted-foreground tabular-nums">
          {point.count} {point.count === 1 ? t("user") : t("users")}
        </p>
      </div>
    );
  };

  const description = `${t("description.line1")} ${t("description.line2")}`;

  if (error) return <ChartMessage>{t("noData")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-[44rem]" />;

  return (
    <ChartBlock title={t("title")} description={description}>
      {total === 0 ? (
        <ChartMessage>{t("noData")}</ChartMessage>
      ) : (
        <div
          className={`space-y-4 transition-opacity ${loading ? "opacity-50" : ""}`}
          aria-busy={loading}
        >
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {bySex.map(({ sex, mean }) => (
              <LegendDot
                key={sex}
                color={colorOf(sex)}
                label={
                  mean != null
                    ? `${labelOf(sex)} (${mean.toFixed(1)} ${t("yearsAvg")})`
                    : labelOf(sex)
                }
              />
            ))}
          </div>
          {/* Near-square, so the diagonal sits at 45° and both axes read alike. */}
          <div className="aspect-square max-h-[36rem] min-h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 4, bottom: 24 }}>
                <CartesianGrid stroke={colors.grid} />
                <XAxis
                  type="number"
                  dataKey="transitionAge"
                  domain={domain}
                  ticks={ticks}
                  allowDecimals={false}
                  tick={{ ...AXIS_TICK, fill: colors.muted }}
                  axisLine={{ stroke: colors.axis }}
                  tickLine={false}
                  label={{
                    value: t("axis.transitionAge"),
                    position: "bottom",
                    offset: 8,
                    fill: colors.muted,
                    fontSize: AXIS_TICK.fontSize,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="detransitionAge"
                  domain={domain}
                  ticks={ticks}
                  allowDecimals={false}
                  tick={{ ...AXIS_TICK, fill: colors.muted }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  label={{
                    value: t("axis.detransitionAge"),
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                    fill: colors.muted,
                    fontSize: AXIS_TICK.fontSize,
                  }}
                />
                <Tooltip
                  content={renderTooltip}
                  cursor={{ strokeDasharray: "3 3", stroke: colors.axis }}
                />
                {/* Transition age = detransition age: no time transitioned. */}
                <ReferenceLine
                  segment={[
                    { x: domain[0], y: domain[0] },
                    { x: domain[1], y: domain[1] },
                  ]}
                  stroke={colors.axis}
                  strokeDasharray="5 5"
                />
                {bySex.map(({ sex, points }) => (
                  <Scatter
                    key={sex}
                    name={labelOf(sex)}
                    data={points}
                    fill={colorOf(sex)}
                    shape={renderDot}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <ChartFootnote>{t("coverage", { count: total })}</ChartFootnote>
        </div>
      )}
    </ChartBlock>
  );
}
