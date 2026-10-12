"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NoulBucket } from "./useFeatureData";

interface NoulHistogramProps {
  buckets: NoulBucket[];
  threshold: number;
  total: number;
}

const TONE_COLORS = {
  no: "#94a3b8", // slate-400 — confidently below the uncertain band
  maybe: "#f59e0b", // amber-500 — uncertain probability mass
  yes: "#3b82f6", // blue-500 — confidently true at the threshold
} as const;

/**
 * Distribution of Jev probabilities for a yes/no feature. The colour bands
 * make the uncertainty visible instead of collapsing everything to a single
 * binary tag: amber mass is where the evidence is genuinely mixed.
 */
export default function NoulHistogram({
  buckets,
  threshold,
  total,
}: NoulHistogramProps) {
  const t = useTranslations("statsPage.features.noul");

  const data = buckets.map((bucket) => ({
    label: bucket.from.toFixed(1),
    from: bucket.from,
    to: bucket.to,
    count: bucket.count,
    share: total > 0 ? bucket.count / total : 0,
    tone: (bucket.to <= 0.2
      ? "no"
      : bucket.from >= threshold
        ? "yes"
        : "maybe") as keyof typeof TONE_COLORS,
  }));

  const thresholdBucket =
    data.find((d) => threshold >= d.from && threshold < d.to) ??
    data[data.length - 1];

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as (typeof data)[number];
    return (
      <div className="border-border bg-background rounded border p-2 text-sm shadow-lg">
        <p className="font-medium">
          {t("range", { from: point.from.toFixed(1), to: point.to.toFixed(1) })}
        </p>
        <p className="text-muted-foreground">
          {t("count", {
            count: point.count,
            percent: Math.round(point.share * 100),
          })}
        </p>
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 13 }}
            interval={1}
            tickMargin={4}
          />
          <YAxis allowDecimals={false} width={28} tick={{ fontSize: 13 }} />
          <Tooltip content={renderTooltip} cursor={{ fill: "transparent" }} />
          {thresholdBucket && (
            <ReferenceLine
              x={thresholdBucket.label}
              stroke="#3b82f6"
              strokeDasharray="4 4"
              label={{
                value: t("thresholdShort", { threshold }),
                position: "insideTopRight",
                fontSize: 13,
                fill: "#3b82f6",
              }}
            />
          )}
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((point) => (
              <Cell key={point.label} fill={TONE_COLORS[point.tone]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: TONE_COLORS.no }}
          />
          {t("legend.no")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: TONE_COLORS.maybe }}
          />
          {t("legend.maybe")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: TONE_COLORS.yes }}
          />
          {t("legend.yes")}
        </span>
      </div>
    </div>
  );
}
