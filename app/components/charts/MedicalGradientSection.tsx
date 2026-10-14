"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useChartColors } from "./chart-theme";
import { ChartSkeleton } from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useFeatureQuery } from "./useFeatureData";

interface TierRow {
  key: string;
  n: number;
  regrets: number;
  noRegret: number;
  notStated: number;
}

interface GradientResponse {
  cohort: number;
  tiers: TierRow[];
}

const SEGMENTS = ["regrets", "noRegret", "notStated"] as const;

/**
 * Regret composition by the most invasive medical step a story reached.
 * Purely descriptive: people who stop early never reach later tiers.
 */
export default function MedicalGradientSection() {
  const t = useTranslations("statsPage.gradient");
  const colors = useChartColors();
  const segmentColor = {
    regrets: colors.negative,
    noRegret: colors.positive,
    notStated: colors.neutral,
  } as const;
  const [data, setData] = useState<GradientResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useFeatureQuery();

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/features/medical-gradient?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as GradientResponse;
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

  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("error")}: {error}
      </p>
    );
  }

  if (loading && !data) {
    return <ChartSkeleton height="h-56" />;
  }

  const tiers = (data?.tiers ?? []).filter((tier) => tier.n > 0);
  if (tiers.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  const statedOf = (key: string) => {
    const tier = tiers.find((row) => row.key === key);
    if (!tier) return null;
    const stated = tier.regrets + tier.noRegret;
    return stated > 0
      ? { percent: Math.round((tier.regrets / stated) * 100), n: stated }
      : null;
  };
  const surgery = statedOf("surgery");
  const hormones = statedOf("hormones");

  return (
    <div className="space-y-5">
      {surgery && (
        <p className="text-base">
          {hormones
            ? t("headlineCompare", {
                percent: surgery.percent,
                n: surgery.n,
                hormones: hormones.percent,
                nHormones: hormones.n,
              })
            : t("headline", { percent: surgery.percent, n: surgery.n })}
        </p>
      )}
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {SEGMENTS.map((segment) => (
          <LegendDot
            key={segment}
            color={segmentColor[segment]}
            label={
              segment === "regrets"
                ? t("regret")
                : segment === "noRegret"
                  ? t("noRegret")
                  : t("notStated")
            }
          />
        ))}
      </div>

      <div className="space-y-4">
        {tiers.map((tier) => {
          const stated = tier.regrets + tier.noRegret;
          const regretPct = stated > 0 ? (tier.regrets / stated) * 100 : 0;
          return (
            <div
              key={tier.key}
              className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3 sm:grid-cols-[11rem_1fr_5rem]"
            >
              <span className="text-base leading-snug">
                {t(`tiers.${tier.key}`)}
              </span>
              <div
                className="flex h-8 w-full overflow-hidden rounded"
                title={t("tierTooltip", {
                  n: tier.n,
                  regrets: tier.regrets,
                  noRegret: tier.noRegret,
                  notStated: tier.notStated,
                })}
              >
                {SEGMENTS.map((segment) => {
                  const value = tier[segment];
                  const share = tier.n > 0 ? (value / tier.n) * 100 : 0;
                  if (share === 0) return null;
                  return (
                    <span
                      key={segment}
                      className={`flex items-center justify-center text-sm font-medium ${
                        segment === "notStated"
                          ? "text-slate-900"
                          : "text-white"
                      }`}
                      style={{
                        width: `${share}%`,
                        background: segmentColor[segment],
                      }}
                    >
                      {share >= 12 ? `${Math.round(share)}%` : ""}
                    </span>
                  );
                })}
              </div>
              <span className="text-right text-base whitespace-nowrap tabular-nums">
                <span className="font-medium">{Math.round(regretPct)}%</span>
                <span className="text-muted-foreground block text-sm">
                  {t("count", { n: tier.n })}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground text-sm">{t("statedNote")}</p>
      <p className="text-muted-foreground text-sm">{t("selectionNote")}</p>
      <p className="text-muted-foreground text-sm">
        {t("basedOn", { cohort: data?.cohort ?? 0 })}
      </p>
    </div>
  );
}
