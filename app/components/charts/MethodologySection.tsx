"use client";

import { Link } from "@/i18n/routing";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
  ChartBlock,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import ChoiceDistribution from "./ChoiceDistribution";
import { LegendDot } from "./PrevalenceRows";
import { useFeatureDetail, useFilteredJson } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

/** Features shown in the threshold-sensitivity chart, in colour order. */
const SENSITIVITY_KEYS = [
  "regret_transition",
  "adv_trauma_history",
  "mh_depression",
  "contributed_online_influence",
  "internalised_homophobia",
];

interface DatasetStats {
  comments: number;
  posts: number;
  authors: number;
  selected: number;
  removed: number;
  remaining: number;
  cohort: number;
}

/** Static explainer for how the dataset and the Jev evaluations are built. */
export default function MethodologySection() {
  const t = useTranslations("statsPage.methodology");
  const format = useFormatter();
  const [stats, setStats] = useState<DatasetStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stats/dataset", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as DatasetStats;
      })
      .then((json) => setStats(json))
      .catch(() => {
        // Numbers are progressive enhancement: prose still reads without them.
      });
    return () => controller.abort();
  }, []);

  const rows = stats
    ? [
        { label: t("table.comments"), value: format.number(stats.comments) },
        { label: t("table.posts"), value: format.number(stats.posts) },
        { label: t("table.authors"), value: format.number(stats.authors) },
        { label: t("table.selected"), value: format.number(stats.selected) },
        {
          label: t("table.removed"),
          value: `−${format.number(stats.removed)}`,
        },
        { label: t("table.remaining"), value: format.number(stats.remaining) },
        { label: t("table.cohort"), value: format.number(stats.cohort) },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="prose dark:prose-invert max-w-none space-y-3">
        <p>{t("p1")}</p>
        <p>{t("p1b")}</p>
        {rows.length > 0 && (
          <div className="not-prose overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-border border-b last:border-0"
                  >
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p>{t("p2")}</p>
        <p>{t("p3")}</p>
        <p>{t("p4")}</p>
        <p>
          {t.rich("p5", {
            prompts: (chunks) => <Link href="/prompts">{chunks}</Link>,
          })}
        </p>
      </div>
      {/* 
      <ChartBlock
        title={t("threshold.title")}
        description={t("threshold.description")}
      >
        <ThresholdSensitivity />
      </ChartBlock>
*/}
      <ChartBlock
        title={t("accountType.title")}
        description={t("accountType.description")}
      >
        <AccountTypes />
      </ChartBlock>

      <ChartBlock
        title={t("detail.title")}
        description={t("detail.description")}
      >
        <DetailLevels />
      </ChartBlock>
    </div>
  );
}

interface SensitivityResponse {
  thresholds: number[];
  features: {
    key: string;
    label: string;
    n: number;
    mean: number | null;
    shares: { threshold: number; share: number }[];
  }[];
}

function ThresholdSensitivity() {
  const t = useTranslations("statsPage.methodology.threshold");
  const labels = useFeatureLabels();
  const colors = useChartColors();
  const { data, loading, error } = useFilteredJson<SensitivityResponse>(
    `/api/features/threshold-sensitivity?keys=${SENSITIVITY_KEYS.join(",")}`,
  );

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-80" />;
  if (!data || data.features.length === 0) return null;

  const colorOf = (key: string) =>
    colors.series[Math.max(0, SENSITIVITY_KEYS.indexOf(key))];
  const chartData = data.thresholds.map((threshold, index) => {
    const point: Record<string, number> = { threshold };
    for (const feature of data.features) {
      point[feature.key] =
        Math.round((feature.shares[index]?.share ?? 0) * 1000) / 10;
    }
    return point;
  });

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="border-border bg-background space-y-1 rounded-md border p-3 text-sm shadow-lg">
        <p className="font-medium">{t("tooltip", { threshold: label })}</p>
        {data.features.map((feature) => {
          const entry = payload.find(
            (item: any) => item.dataKey === feature.key,
          );
          return entry ? (
            <p key={feature.key} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: colorOf(feature.key) }}
              />
              {labels.feature(feature.key, feature.label)}:{" "}
              <span className="font-medium tabular-nums">
                {Math.round(entry.value)}%
              </span>
            </p>
          ) : null;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {data.features.map((feature) => (
          <LegendDot
            key={feature.key}
            color={colorOf(feature.key)}
            label={labels.feature(feature.key, feature.label)}
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
              dataKey="threshold"
              type="number"
              domain={[0.5, 0.95]}
              ticks={data.thresholds}
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
              tickFormatter={(value) => `${value}%`}
              tick={{ ...AXIS_TICK, fill: colors.muted }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <ReferenceLine
              x={0.8}
              stroke={colors.ink}
              strokeDasharray="4 4"
              label={{
                value: t("siteThreshold"),
                position: "insideTopRight",
                fontSize: AXIS_TICK.fontSize,
                fill: colors.ink,
              }}
            />
            <Tooltip content={renderTooltip} />
            {data.features.map((feature) => (
              <Line
                key={feature.key}
                type="linear"
                dataKey={feature.key}
                stroke={colorOf(feature.key)}
                strokeWidth={2}
                dot={{ r: 4 }}
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

function AccountTypes() {
  const t = useTranslations("statsPage.methodology");
  const labels = useFeatureLabels();
  const { data, loading } = useFeatureDetail("quality_account_type");
  if (loading && !data) return <ChartSkeleton height="h-40" />;
  if (!data?.choice) return null;
  return (
    <ChoiceDistribution
      options={data.choice.options.map((option) => ({
        key: option.key,
        label: t.has(`accountType.options.${option.key}`)
          ? t(`accountType.options.${option.key}`)
          : labels.option(option.key),
        description: option.description,
        soft: option.soft,
        hard: option.hard,
      }))}
      total={data.choice.nChoice}
      mode="hard"
      showNote={false}
    />
  );
}

function DetailLevels() {
  const t = useTranslations("statsPage.methodology.detail");
  const { data, loading } = useFeatureDetail("quality_detail_level");
  if (loading && !data) return <ChartSkeleton height="h-40" />;
  if (!data?.score) return null;
  // Fold the fine-grained score bins back onto the four rubric levels.
  const counts = data.score.levels.map(() => 0);
  for (const bin of data.score.bins) {
    const level = Math.min(
      counts.length - 1,
      Math.round((bin.from + bin.to) / 2),
    );
    counts[level] += bin.count;
  }
  return (
    <ChoiceDistribution
      options={counts.map((count, level) => ({
        key: `level${level}`,
        label: t(`levels.level${level}`),
        soft: count,
        hard: count,
      }))}
      total={data.score.nValues}
      mode="hard"
      sort={false}
      showNote={false}
    />
  );
}
