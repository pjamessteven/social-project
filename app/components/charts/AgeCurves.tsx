"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, useChartColors } from "./chart-theme";
import {
  CHART_TITLE,
  ChartCard,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import { AGE_DOMAIN, AGE_TICKS, type JourneyState } from "./useJourney";

/** Same series slots as the journey ridgeline below it. */
const SERIES = [
  { key: "transition_age", label: "transition", slot: 0 },
  { key: "detransition_age", label: "detransition", slot: 1 },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];
type Row = { age: number } & Record<SeriesKey, number> &
  Record<`${SeriesKey}__n`, number>;

/** The y axis stays at 0–20% unless a narrow filter pushes a peak above it,
 * so switching filters does not rescale the chart. */
const Y_MAX = 20;

/**
 * Age at transition and at detransition as two lines on one fixed age axis,
 * each as a share of the stories that give that age, so the gap between
 * them reads at a glance and filtered groups compare like for like.
 */
export default function AgeCurves({ data, loading, error }: JourneyState) {
  const t = useTranslations("statsPage.journey");
  const colors = useChartColors();

  const milestones = useMemo(() => {
    const byKey = new Map(data?.milestones.map((m) => [m.key, m]));
    return SERIES.map((series) => ({
      ...series,
      milestone: byKey.get(series.key),
    }));
  }, [data]);

  const chartData = useMemo(() => {
    const [low, high] = AGE_DOMAIN;
    const rows: Row[] = [];
    for (let age = low; age <= high; age++) {
      rows.push({
        age,
        transition_age: 0,
        detransition_age: 0,
        transition_age__n: 0,
        detransition_age__n: 0,
      });
    }
    for (const { key, milestone } of milestones) {
      if (!milestone?.n) continue;
      for (const point of milestone.counts) {
        const row = rows[point.age - low];
        if (!row) continue;
        row[key] = (point.count / milestone.n) * 100;
        row[`${key}__n`] = point.count;
      }
    }
    return rows;
  }, [milestones]);

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as Row;
    return (
      <div className="border-border bg-background space-y-1.5 rounded-md border p-3 text-sm shadow-lg">
        <p className="font-medium">{t("curvesTooltip", { age: label })}</p>
        {SERIES.map((series) => (
          <p key={series.key} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: colors.series[series.slot] }}
            />
            {t(`milestones.${series.label}`)}:{" "}
            <span className="font-medium tabular-nums">
              {point[series.key].toFixed(1)}%
            </span>
            <span className="text-muted-foreground tabular-nums">
              ({t("curvesStories", { count: point[`${series.key}__n`] })})
            </span>
          </p>
        ))}
      </div>
    );
  };

  const hasData = milestones.some(({ milestone }) => (milestone?.n ?? 0) > 0);

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-96" />;

  return (
    <ChartCard>
      <div className="mb-6">
        <h3 className={CHART_TITLE}>{t("curvesTitle")}</h3>
        <p className="text-muted-foreground mt-2 text-base">
          {t("curvesDescription")}
        </p>
      </div>
      {!hasData ? (
        <ChartMessage>{t("empty")}</ChartMessage>
      ) : (
        <div
          className={`space-y-4 transition-opacity ${loading ? "opacity-50" : ""}`}
          aria-busy={loading}
        >
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {milestones.map(({ key, label, slot, milestone }) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-4 rounded-full"
                  style={{ background: colors.series[slot] }}
                />
                <span className="font-medium">{t(`milestones.${label}`)}</span>
                <span className="text-muted-foreground">
                  {milestone?.median != null &&
                    `${t("median", { age: milestone.median })} · `}
                  {t("count", { n: milestone?.n ?? 0 })}
                </span>
              </li>
            ))}
          </ul>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid vertical={false} stroke={colors.grid} />
                <XAxis
                  dataKey="age"
                  type="number"
                  domain={AGE_DOMAIN}
                  ticks={AGE_TICKS}
                  allowDecimals={false}
                  tick={{ ...AXIS_TICK, fill: colors.muted }}
                  axisLine={{ stroke: colors.axis }}
                  tickLine={false}
                />
                <YAxis
                  domain={[
                    0,
                    (dataMax: number) =>
                      Math.max(Y_MAX, Math.ceil(dataMax / 5) * 5),
                  ]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ ...AXIS_TICK, fill: colors.muted }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={renderTooltip} />
                {milestones.map(({ key, slot, milestone }) =>
                  milestone?.median != null ? (
                    <ReferenceLine
                      key={`${key}-median`}
                      x={milestone.median}
                      stroke={colors.series[slot]}
                      strokeDasharray="3 3"
                    />
                  ) : null,
                )}
                {SERIES.map((series) => (
                  <Line
                    key={series.key}
                    type="linear"
                    dataKey={series.key}
                    name={t(`milestones.${series.label}`)}
                    stroke={colors.series[series.slot]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartFootnote>{t("curvesNote")}</ChartFootnote>
        </div>
      )}
    </ChartCard>
  );
}
