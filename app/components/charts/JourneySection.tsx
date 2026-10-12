"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, useChartColors } from "./chart-theme";
import { ChartSkeleton, ROW_GROUP_TITLE } from "./ChartParts";
import { buildFeatureParams } from "./useFeatureData";

interface Milestone {
  key: string;
  n: number;
  median: number | null;
  min: number | null;
  max: number | null;
  counts: { age: number; count: number }[];
}

interface JourneyResponse {
  cohort: number;
  milestones: Milestone[];
  duration: {
    n: number;
    median: number | null;
    min: number | null;
    max: number | null;
    counts: { age: number; count: number }[];
  } | null;
}

/** Categorical slot per milestone (fixed, see chart-theme). */
const SLOTS: Record<string, number> = {
  first_dysphoria_age: 6,
  transition_age: 0,
  hormones_age: 2,
  detransition_age: 1,
};

const LABEL_KEYS: Record<string, string> = {
  first_dysphoria_age: "first_dysphoria",
  transition_age: "transition",
  hormones_age: "hormones",
  detransition_age: "detransition",
};

/**
 * The "typical journey": one mini histogram per milestone, all sharing an
 * age axis, with median markers — a ridgeline of when things happened.
 */
export default function JourneySection() {
  const t = useTranslations("statsPage.journey");
  const colors = useChartColors();
  const searchParams = useSearchParams();
  const [data, setData] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = buildFeatureParams(searchParams);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/features/journey?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as JourneyResponse;
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

  // Shared age axis: from the youngest age to the 99th percentile across all
  // milestones, rounded to 5-year steps, so a few very late ages do not
  // squash everything else.
  const domain = useMemo(() => {
    if (!data) return [5, 40] as [number, number];
    const ages = data.milestones
      .flatMap((milestone) =>
        milestone.counts.flatMap((point) =>
          Array.from({ length: point.count }, () => point.age),
        ),
      )
      .sort((a, b) => a - b);
    if (ages.length === 0) return [5, 40] as [number, number];
    const low = Math.floor(ages[0] / 5) * 5;
    const high = Math.ceil(ages[Math.floor(ages.length * 0.99)] / 5) * 5;
    return [low, Math.max(low + 10, high)] as [number, number];
  }, [data]);
  const ticks = useMemo(() => {
    const values: number[] = [];
    for (let age = domain[0]; age <= domain[1]; age += 5) values.push(age);
    return values;
  }, [domain]);

  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("error")}: {error}
      </p>
    );
  }

  if (loading && !data) {
    return <ChartSkeleton height="h-72" />;
  }

  if (!data || data.milestones.every((milestone) => milestone.n === 0)) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as { age: number; count: number };
    return (
      <div className="border-border bg-background rounded border p-2 text-sm shadow-lg">
        <p className="font-medium">
          {t("tooltip", { age: point.age, count: point.count })}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {data.milestones.map((milestone, index) => (
        <div
          key={milestone.key}
          className="grid grid-cols-[7.5rem_1fr] items-center gap-3 sm:grid-cols-[10rem_1fr]"
        >
          <div className="text-right">
            <p className={ROW_GROUP_TITLE}>
              {t(`milestones.${LABEL_KEYS[milestone.key]}`)}
            </p>
            <p className="text-muted-foreground text-sm">
              {milestone.median != null &&
                `${t("median", { age: milestone.median })} · `}
              {t("count", { n: milestone.n })}
            </p>
          </div>
          <ResponsiveContainer
            width="100%"
            height={index === data.milestones.length - 1 ? 104 : 80}
          >
            <BarChart
              data={milestone.counts.filter(
                (point) => point.age >= domain[0] && point.age <= domain[1],
              )}
              margin={{ top: 6, right: 8, left: 8, bottom: 0 }}
            >
              <XAxis
                dataKey="age"
                type="number"
                domain={domain}
                ticks={ticks}
                allowDataOverflow
                allowDecimals={false}
                hide={index !== data.milestones.length - 1}
                tick={{ ...AXIS_TICK, fill: colors.muted }}
                height={index === data.milestones.length - 1 ? 24 : 0}
              />
              <YAxis hide domain={[0, "dataMax"]} />
              <Tooltip
                content={renderTooltip}
                cursor={{ fill: "transparent" }}
              />
              {milestone.median != null && (
                <ReferenceLine
                  x={milestone.median}
                  stroke={colors.series[SLOTS[milestone.key]]}
                  strokeDasharray="3 3"
                />
              )}
              <Bar
                dataKey="count"
                fill={colors.series[SLOTS[milestone.key]]}
                radius={[2, 2, 0, 0]}
                maxBarSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}

      <p className="text-muted-foreground pt-1 text-sm">
        {t("basedOn", { cohort: data.cohort })}
      </p>
    </div>
  );
}
