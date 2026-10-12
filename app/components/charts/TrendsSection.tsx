"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { SMALL_SAMPLE_N, wilson } from "@/app/lib/stats-math";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
import {
  ChartBlock,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import ChoiceByYear, { formatYearBucket } from "./ChoiceByYear";
import { useFeatureSummary, useFilteredJson } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

interface TrendsResponse {
  cohort: number;
  buckets: {
    key: string;
    from: number | null;
    to: number | null;
    n: number;
    medianAge: number | null;
  }[];
  series: {
    key: string;
    points: { bucketKey: string; above: number; n: number }[];
  }[];
}

const DEFAULT_KEYS = [
  "mh_anxiety",
  "top_surgery",
  "adv_childhood_abuse",
  "internalised_misogyny_misandry",
  "contributed_online_influence",
];
const MAX_SERIES = 5;

/** Options coloured in the "main reason by era" bars, in fixed order. */
const REASON_OPTIONS = [
  "trauma",
  "social_role_discomfort",
  "internalised_misogyny_misandry",
  "body_dysmorphia",
  "mental_health_issues",
  "online_influence",
];

/**
 * How the stories differ across transition-year cohorts: any yes/no
 * features as lines, then the main reason for transitioning by era.
 */
export default function TrendsSection() {
  const t = useTranslations("statsPage.trends");
  return (
    <div className="space-y-8">
      <TrendLines />
      <ChartBlock
        title={t("reasonsTitle")}
        description={t("reasonsDescription")}
      >
        <ChoiceByYear
          featureKey="primary_transition_reason"
          options={REASON_OPTIONS}
        />
      </ChartBlock>
    </div>
  );
}

function TrendLines() {
  const t = useTranslations("statsPage.trends");
  const labels = useFeatureLabels();
  const colors = useChartColors();
  const { data: summary } = useFeatureSummary();
  // Each selected key keeps its colour slot until removed, so adding or
  // removing a series never repaints the others.
  const [slots, setSlots] = useState<(string | null)[]>(DEFAULT_KEYS);
  const keys = slots.filter((key): key is string => key != null);
  const { data, loading, error } = useFilteredJson<TrendsResponse>(
    `/api/features/trends?keys=${encodeURIComponent(keys.join(","))}`,
  );

  const noulFeatures = useMemo(
    () =>
      (summary?.features ?? [])
        .filter(
          (feature) =>
            feature.kind === "noul" &&
            feature.n > 0 &&
            feature.group !== "quality",
        )
        .map((feature) => ({
          key: feature.key,
          label: labels.feature(feature.key, feature.label),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [summary, labels],
  );
  const labelOf = (key: string) =>
    noulFeatures.find((feature) => feature.key === key)?.label ??
    labels.feature(key, key);
  const colorOf = (key: string) =>
    colors.series[Math.max(0, slots.indexOf(key)) % colors.series.length];

  const addKey = (key: string) => {
    if (keys.includes(key) || keys.length >= MAX_SERIES) return;
    setSlots((current) => {
      const free = current.indexOf(null);
      if (free === -1) return [...current, key];
      const next = [...current];
      next[free] = key;
      return next;
    });
  };
  const removeKey = (key: string) =>
    setSlots((current) => current.map((slot) => (slot === key ? null : slot)));

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.buckets.map((bucket, index) => {
      const point: Record<string, number | string | null> = {
        bucket: formatYearBucket(bucket),
        n: bucket.n,
      };
      for (const series of data.series) {
        const entry = series.points[index];
        if (!entry || entry.n === 0) {
          point[series.key] = null;
          continue;
        }
        const interval = wilson(entry.above, entry.n);
        point[series.key] = Math.round((entry.above / entry.n) * 1000) / 10;
        point[`${series.key}__low`] = Math.round(interval.low * 100);
        point[`${series.key}__high`] = Math.round(interval.high * 100);
        point[`${series.key}__n`] = entry.n;
      }
      return point;
    });
  }, [data]);

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length || !data) return null;
    const point = payload[0]?.payload as Record<string, any>;
    return (
      <div className="border-border bg-background space-y-1.5 rounded-md border p-3 text-sm shadow-lg">
        <p className="font-medium">
          {t("tooltip", { bucket: label, n: point.n })}
        </p>
        {data.series.map((series) =>
          point[series.key] == null ? null : (
            <p key={series.key} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: colorOf(series.key) }}
              />
              {labelOf(series.key)}:{" "}
              <span className="font-medium tabular-nums">
                {Math.round(point[series.key])}%
              </span>
              <span className="text-muted-foreground tabular-nums">
                ({point[`${series.key}__low`]}–{point[`${series.key}__high`]}%)
              </span>
            </p>
          ),
        )}
      </div>
    );
  };

  // Points from cohorts with few answers are drawn hollow.
  const renderDot = (key: string) => {
    const Dot = ({ cx, cy, payload, index }: any) => {
      const dotKey = `${key}-${index}`;
      if (cx == null || cy == null || payload?.[key] == null) {
        return <g key={dotKey} />;
      }
      const small = (payload[`${key}__n`] ?? 0) < SMALL_SAMPLE_N;
      return (
        <circle
          key={dotKey}
          cx={cx}
          cy={cy}
          r={4.5}
          fill={small ? (colors.isDark ? "#1a1a19" : "#ffffff") : colorOf(key)}
          stroke={colorOf(key)}
          strokeWidth={2}
        />
      );
    };
    Dot.displayName = `TrendDot(${key})`;
    return Dot;
  };

  const picker = (
    <div className="flex flex-wrap items-center gap-2">
      {keys.map((key) => (
        <span
          key={key}
          className="bg-muted flex items-center gap-2 rounded-full py-1 pr-1.5 pl-3 text-sm"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: colorOf(key) }}
          />
          {labelOf(key)}
          <button
            type="button"
            onClick={() => removeKey(key)}
            className="hover:bg-background rounded-full p-1"
            aria-label={t("remove", { label: labelOf(key) })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {keys.length < MAX_SERIES && noulFeatures.length > 0 && (
        <Select value="" onValueChange={addKey}>
          <SelectTrigger className="h-9 w-56 text-sm">
            <SelectValue placeholder={t("add")} />
          </SelectTrigger>
          <SelectContent>
            {noulFeatures
              .filter((feature) => !keys.includes(feature.key))
              .map((feature) => (
                <SelectItem key={feature.key} value={feature.key}>
                  {feature.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  return (
    <ChartBlock
      title={t("linesTitle")}
      description={t("linesDescription")}
      controls={picker}
    >
      <div className="space-y-5">
        {error && <ChartMessage>{t("error")}</ChartMessage>}
        {loading && !data && <ChartSkeleton height="h-80" />}
        {data && data.cohort === 0 && <ChartMessage>{t("empty")}</ChartMessage>}

        {data && data.cohort > 0 && (
          <>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid vertical={false} stroke={colors.grid} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ ...AXIS_TICK, fill: colors.muted }}
                    axisLine={{ stroke: colors.axis }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tick={{ ...AXIS_TICK, fill: colors.muted }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={renderTooltip} />
                  {data.series.map((series) => (
                    <Line
                      key={series.key}
                      type="linear"
                      dataKey={series.key}
                      name={labelOf(series.key)}
                      stroke={colorOf(series.key)}
                      strokeWidth={2}
                      dot={renderDot(series.key)}
                      activeDot={{ r: 6 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ChartFootnote>{t("strictNote")}</ChartFootnote>
            <ChartFootnote>
              {t("basedOn", { cohort: data.cohort })}
            </ChartFootnote>
          </>
        )}
      </div>
    </ChartBlock>
  );
}
