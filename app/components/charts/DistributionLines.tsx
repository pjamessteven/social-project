"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildFeatureParams, prettifyKey } from "./useFeatureData";

interface GroupDistribution {
  key: string;
  n: number;
  counts: number[];
  bands: { no: number; mixed: number; yes: number };
}

interface DistributionResponse {
  key: string;
  split: string;
  bins: number;
  overall: {
    n: number;
    counts: number[];
    bands: { no: number; mixed: number; yes: number };
  };
  groups: GroupDistribution[];
}

const GROUP_COLORS: Record<string, string> = {
  detransitioned: "#3b82f6",
  still_trans_questioning: "#8b5cf6",
  desisted: "#10b981",
  questioning: "#f59e0b",
  retransitioned: "#ec4899",
};
const FALLBACK_COLORS = ["#06b6d4", "#84cc16", "#f97316", "#8b5cf6"];
const OVERALL_COLOR = "#64748b";

const BAND_COLORS = { no: "#94a3b8", mixed: "#f59e0b", yes: "#3b82f6" };
const Y_TICKS = [0, 1, 2, 5, 10, 20, 40, 60, 80];

/**
 * Full probability distribution of a yes/no feature: one line per cohort
 * group over the 0-1 Jev probability, on a square-root y-axis so the small
 * bins stay visible next to the spike at zero. Below it, the no / mixed /
 * yes composition per group — what the binary threshold alone would hide.
 */
export default function DistributionLines({
  featureKey,
}: {
  featureKey: string;
}) {
  const t = useTranslations("statsPage.suicidality");
  const statusT = useTranslations("statsPage.current_status");
  const searchParams = useSearchParams();
  const [data, setData] = useState<DistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = buildFeatureParams(searchParams);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(
      `/api/features/distribution?key=${encodeURIComponent(featureKey)}&${params}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as DistributionResponse;
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
  }, [featureKey, params]);

  const groupLabel = (key: string) =>
    statusT.has(`choice.options.${key}`)
      ? statusT(`choice.options.${key}`)
      : prettifyKey(key);

  const series = useMemo(() => {
    if (!data)
      return [] as { key: string; label: string; color: string; n: number }[];
    return [
      {
        key: "overall",
        label: t("overall"),
        color: OVERALL_COLOR,
        n: data.overall.n,
      },
      ...data.groups.map((group, index) => ({
        key: group.key,
        label: groupLabel(group.key),
        color:
          GROUP_COLORS[group.key] ??
          FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        n: group.n,
      })),
    ];
  }, [data, t, statusT]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: data.bins }, (_, index) => {
      const point: Record<string, number | string> = {
        x: index / data.bins,
        label: `${(index / data.bins).toFixed(2)}–${(
          (index + 1) /
          data.bins
        ).toFixed(2)}`,
      };
      point.overall =
        data.overall.n > 0
          ? (data.overall.counts[index] / data.overall.n) * 100
          : 0;
      point.overallCount = data.overall.counts[index];
      for (const group of data.groups) {
        point[group.key] =
          group.n > 0 ? (group.counts[index] / group.n) * 100 : 0;
        point[`${group.key}Count`] = group.counts[index];
      }
      return point;
    });
  }, [data]);

  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("error")}: {error}
      </p>
    );
  }

  if (loading && !data) {
    return <div className="bg-muted h-64 w-full animate-pulse rounded" />;
  }

  if (!data || data.overall.n === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  const maxShare = Math.max(
    ...chartData.map((point) => Number(point.overall)),
    ...data.groups.flatMap((group) =>
      chartData.map((point) => Number(point[group.key] ?? 0)),
    ),
  );
  const yTicks = Y_TICKS.filter((tick) => tick <= Math.ceil(maxShare));

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload as Record<string, any>;
    return (
      <div className="border-border bg-background max-w-xs space-y-1 rounded border p-2 text-sm shadow-lg">
        <p className="font-medium">{t("tooltipBin", { range: point.label })}</p>
        {series.map((entry) => (
          <p key={entry.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
            <span>
              {t("tooltipCount", {
                count:
                  point[
                    entry.key === "overall"
                      ? "overallCount"
                      : `${entry.key}Count`
                  ],
              })}
            </span>
          </p>
        ))}
      </div>
    );
  };

  const bandPercents = (
    bands: {
      no: number;
      mixed: number;
      yes: number;
    },
    n: number,
  ) => ({
    no: n > 0 ? (bands.no / n) * 100 : 0,
    mixed: n > 0 ? (bands.mixed / n) * 100 : 0,
    yes: n > 0 ? (bands.yes / n) * 100 : 0,
  });

  const renderBandRow = (
    key: string,
    label: string,
    color: string | null,
    bands: { no: number; mixed: number; yes: number },
    n: number,
  ) => {
    const percents = bandPercents(bands, n);
    return (
      <div
        key={key}
        className="grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-3"
      >
        <span
          className="flex items-center gap-1.5 truncate text-sm"
          title={label}
        >
          {color && (
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: color }}
            />
          )}
          <span className="truncate">{label}</span>
        </span>
        <div className="flex h-8 w-full overflow-hidden rounded">
          {(["no", "mixed", "yes"] as const).map((band) => {
            const share = percents[band];
            if (share <= 0) return null;
            return (
              <span
                key={band}
                className="flex items-center justify-center text-sm font-medium text-white"
                style={{
                  width: `${share}%`,
                  background: BAND_COLORS[band],
                }}
                title={`${t(`bands.${band}`)}: ${Math.round(share)}%`}
              >
                {share >= 12 ? `${Math.round(share)}%` : ""}
              </span>
            );
          })}
        </div>
        <span className="text-muted-foreground text-right text-sm whitespace-nowrap tabular-nums">
          {t("count", { n })}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value: number) => String(value)}
              tick={{ fontSize: 13 }}
            />
            <YAxis
              scale="sqrt"
              domain={[0, "dataMax"]}
              ticks={yTicks}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fontSize: 13 }}
              width={42}
            />
            <Tooltip content={renderTooltip} />
            {series.map((entry) => (
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label}
                stroke={entry.color}
                strokeWidth={entry.key === "overall" ? 2.5 : 1.75}
                strokeDasharray={entry.key === "overall" ? "5 3" : undefined}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-muted-foreground text-sm">{t("sqrtNote")}</p>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {series.map((entry) => (
          <span key={entry.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: entry.color }}
            />
            {entry.label} ({entry.n})
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {renderBandRow(
          "overall",
          t("overall"),
          null,
          data.overall.bands,
          data.overall.n,
        )}
        {data.groups.map((group, index) =>
          renderBandRow(
            group.key,
            groupLabel(group.key),
            GROUP_COLORS[group.key] ??
              FALLBACK_COLORS[index % FALLBACK_COLORS.length],
            group.bands,
            group.n,
          ),
        )}
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {(["no", "mixed", "yes"] as const).map((band) => (
          <span key={band} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: BAND_COLORS[band] }}
            />
            {t(`bands.${band}`)}
          </span>
        ))}
      </div>

      <p className="text-muted-foreground text-sm">
        {t("basedOn", { cohort: data.overall.n })}
      </p>
    </div>
  );
}
