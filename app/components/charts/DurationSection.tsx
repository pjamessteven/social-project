"use client";

import { spread, type SpreadSummary } from "@/app/lib/stats-math";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useChartColors } from "./chart-theme";
import {
  ChartBlock,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import DurationCurve from "./DurationCurve";
import DurationHistogram from "./DurationHistogram";
import DurationRanges from "./DurationRanges";
import TransitionDurationChart from "./TransitionDurationChart";
import { useFeatureQuery, useFilteredJson } from "./useFeatureData";
import { useTimelines } from "./useTimelines";

/** Years in transition for one group of people, with its chart colour. */
export interface DurationGroup {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const MEDICAL_TIERS = ["social_only", "hormones", "surgery"] as const;

/** Age at transition bands for the "by age" ranges. */
const AGE_BANDS = [
  { key: "under18", from: 0, to: 17 },
  { key: "18to24", from: 18, to: 24 },
  { key: "25plus", from: 25, to: Infinity },
] as const;

interface TierResponse {
  tiers: ({ key: string } & Partial<SpreadSummary>)[];
}

/**
 * The "Duration" section: how long people stayed in transition, as a
 * histogram and a cumulative curve, broken down by how far they went
 * medically and by age at transition, then each story's ages as a dot plot.
 * One timelines fetch feeds every chart but the medical-step one.
 */
export default function DurationSection() {
  const t = useTranslations("statsPage.duration");
  const tTiers = useTranslations("statsPage.gradient.tiers");
  const colors = useChartColors();
  const { people, loading, error } = useTimelines();
  const tiers = useFilteredJson<TierResponse>("/api/features/duration-by-tier");
  const sexFilter = new URLSearchParams(useFeatureQuery()).get("sex");

  // Women and men side by side, or the one sex the filters select.
  const groups = useMemo<DurationGroup[]>(() => {
    if (!people) return [];
    const years = (sex: "f" | "m" | null) =>
      people
        .filter((person) => person.years != null)
        .filter((person) => sex == null || person.sex === sex)
        .map((person) => person.years as number);
    const women = {
      key: "f",
      label: t("women"),
      color: colors.women,
      values: years("f"),
    };
    const men = {
      key: "m",
      label: t("men"),
      color: colors.men,
      values: years("m"),
    };
    if (sexFilter === "f") return [women];
    if (sexFilter === "m") return [men];
    return [women, men].filter((group) => group.values.length > 0);
  }, [people, sexFilter, colors, t]);

  const ageRanges = useMemo(
    () =>
      AGE_BANDS.map((band) => ({
        key: band.key,
        label: t(`ageBands.${band.key}`),
        summary: spread(
          (people ?? [])
            .filter(
              (person) =>
                person.years != null &&
                person.transition != null &&
                person.transition >= band.from &&
                person.transition <= band.to,
            )
            .map((person) => person.years as number),
        ),
      })),
    [people, t],
  );

  const tierRanges = (tiers.data?.tiers ?? [])
    .filter((tier) => (MEDICAL_TIERS as readonly string[]).includes(tier.key))
    .map((tier) => ({
      key: tier.key,
      label: tTiers(tier.key),
      summary:
        tier.n && tier.median != null
          ? (tier as unknown as SpreadSummary)
          : null,
    }));

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !people) return <ChartSkeleton height="h-[28rem]" />;

  const all = groups.flatMap((group) => group.values);
  if (all.length === 0) return <ChartMessage>{t("empty")}</ChartMessage>;

  const within = (years: number) =>
    Math.round(
      (all.filter((value) => value <= years).length / all.length) * 100,
    );
  const overall = spread(all)!;
  const fade = loading ? "opacity-50 transition-opacity" : "transition-opacity";

  return (
    <div className={`space-y-8 ${fade}`} aria-busy={loading}>
      <p className="text-base">
        {t("headline", {
          one: within(1),
          five: within(5),
          median: overall.median,
          n: all.length,
        })}
      </p>

      <ChartBlock
        title={t("histogramTitle")}
        description={t("histogramDescription")}
      >
        <DurationHistogram groups={groups} />
      </ChartBlock>

      <ChartBlock title={t("curveTitle")} description={t("curveDescription")}>
        <DurationCurve groups={groups} />
      </ChartBlock>

      {tiers.error ? (
        <ChartMessage>{t("error")}</ChartMessage>
      ) : tiers.loading && !tiers.data ? (
        <ChartSkeleton height="h-72" />
      ) : (
        <ChartBlock
          title={t("byTierTitle")}
          description={t("byTierDescription")}
        >
          <div className="space-y-6">
            <DurationRanges rows={tierRanges} />
            <ChartFootnote>{t("byTierNote")}</ChartFootnote>
          </div>
        </ChartBlock>
      )}

      <ChartBlock title={t("byAgeTitle")} description={t("byAgeDescription")}>
        <DurationRanges rows={ageRanges} />
      </ChartBlock>

      <TransitionDurationChart />
    </div>
  );
}
