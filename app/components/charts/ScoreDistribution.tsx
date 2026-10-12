"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreBin } from "./useFeatureData";

interface ScoreDistributionProps {
  bins: ScoreBin[];
  levels: string[];
  min: number;
  max: number;
  mean: number | null;
}

const SCORE_COLOR = "#3b82f6";

/**
 * Distribution of Jev "score" answers. Scores are expected values on a
 * continuous scale where integer positions match the criteria list, so the
 * chart bins the values and the criteria are listed underneath for context.
 */
export default function ScoreDistribution({
  bins,
  levels,
  min,
  max,
  mean,
}: ScoreDistributionProps) {
  const t = useTranslations("statsPage.features.score");

  const data = bins.map((bin) => ({
    from: bin.from,
    to: bin.to,
    count: bin.count,
  }));

  const ticks = Array.from(
    { length: Math.max(2, Math.round(max - min + 1)) },
    (_, index) => min + index,
  );

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as (typeof data)[number];
    return (
      <div className="border-border bg-background rounded border p-2 text-sm shadow-lg">
        <p className="font-medium">
          {t("range", { from: point.from.toFixed(1), to: point.to.toFixed(1) })}
        </p>
        <p className="text-muted-foreground">
          {t("count", { count: point.count })}
        </p>
      </div>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
        >
          <XAxis
            dataKey="from"
            type="number"
            domain={[min, max]}
            ticks={ticks}
            tick={{ fontSize: 13 }}
            tickFormatter={(value: number) => String(value)}
          />
          <YAxis allowDecimals={false} width={28} tick={{ fontSize: 13 }} />
          <Tooltip content={renderTooltip} cursor={{ fill: "transparent" }} />
          {mean != null && (
            <ReferenceLine
              x={mean}
              stroke={SCORE_COLOR}
              strokeDasharray="4 4"
              label={{
                value: t("meanShort", { value: mean.toFixed(1) }),
                position: "insideTopRight",
                fontSize: 13,
                fill: SCORE_COLOR,
              }}
            />
          )}
          <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={SCORE_COLOR} />
        </BarChart>
      </ResponsiveContainer>
      <ol className="text-muted-foreground mt-3 space-y-1 text-sm">
        {levels.map((level, index) => (
          <li key={level} className="flex gap-2">
            <span className="text-foreground w-4 shrink-0 text-right font-medium">
              {index}
            </span>
            <span>{level}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
