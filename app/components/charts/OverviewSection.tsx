"use client";

import { Button } from "@/app/components/ui/button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useChartColors } from "./chart-theme";
import {
  ChartCard,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import PrevalenceRows, {
  LegendDot,
  type PrevalenceItem,
} from "./PrevalenceRows";
import { useFeatureSummary } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

/** Bookkeeping features that are not findings in their own right. */
const HIDDEN_KEYS = new Set([
  "regret_not_applicable",
  "no_detransition_occurred",
]);
const TIERS = ["cause", "process", "outcome"] as const;
const LIMIT = 15;

/**
 * Every yes/no statement ranked by how many stories it is clearly true for,
 * coloured by tier (cause / turning point / outcome). A map of the page and
 * an entry point to the stories behind each number.
 */
export default function OverviewSection() {
  const t = useTranslations("statsPage.overview");
  const tiers = useTranslations("statsPage.features.tiers");
  const labels = useFeatureLabels();
  const colors = useChartColors();
  const { data, loading, error } = useFeatureSummary();
  const tp = useTranslations("statsPage.prevalence");
  const [expanded, setExpanded] = useState(false);

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-96" />;
  if (!data) return null;

  const items: PrevalenceItem[] = data.features
    .filter(
      (feature) =>
        feature.kind === "noul" &&
        feature.n > 0 &&
        feature.group !== "quality" &&
        !HIDDEN_KEYS.has(feature.key),
    )
    .map((feature) => ({
      key: feature.key,
      label: labels.feature(feature.key, feature.label),
      n: feature.n,
      above: feature.nAbove,
      color: colors.tier[feature.tier] ?? colors.neutral,
    }));

  return (
    <div className="space-y-4">
      <ChartCard>
        <div className="space-y-4">
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {TIERS.map((tier) => (
              <LegendDot
                key={tier}
                color={colors.tier[tier]}
                label={tiers(tier)}
              />
            ))}
          </div>
          <PrevalenceRows
            items={items}
            limit={expanded ? undefined : LIMIT}
            hideMore
          />
          <ChartFootnote>{t("basedOn", { cohort: data.cohort })}</ChartFootnote>
        </div>
      </ChartCard>
      {items.length > LIMIT && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? tp("showFewer") : tp("showAll", { count: items.length })}
        </Button>
      )}
    </div>
  );
}
