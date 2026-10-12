"use client";

import { Input } from "@/app/components/ui/input";
import { FEATURE_GROUPS } from "@/app/lib/feature-taxonomy";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useChartColors } from "./chart-theme";
import {
  CHART_TITLE,
  ChartCard,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import PrevalenceRows, { LegendDot } from "./PrevalenceRows";
import {
  prettifyKey,
  useFeatureSummary,
  useSexFiltered,
} from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

/** Groups that describe the data rather than the stories. */
const HIDDEN_GROUPS = new Set(["quality", "reasons"]);
const HIDDEN_KEYS = new Set([
  "regret_not_applicable",
  "no_detransition_occurred",
]);

/**
 * Every yes/no statement the AI evaluated, grouped by topic, searchable,
 * with women and men side by side. Rows open matching stories. Choice and
 * scale questions have their own sections, so they are not repeated here.
 */
export default function FeatureExplorer() {
  const t = useTranslations("statsPage.features");
  const tp = useTranslations("statsPage.prevalence");
  const colors = useChartColors();
  const labels = useFeatureLabels();
  const sexFiltered = useSexFiltered();
  const { data, loading, error } = useFeatureSummary();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    const items = data.features
      .filter(
        (feature) =>
          feature.kind === "noul" &&
          feature.n > 0 &&
          !HIDDEN_GROUPS.has(feature.group) &&
          !HIDDEN_KEYS.has(feature.key),
      )
      .map((feature) => ({
        key: feature.key,
        group: feature.group,
        label: labels.feature(feature.key, feature.label),
        n: feature.n,
        above: feature.nAbove,
        bySex: feature.bySex,
      }))
      .filter(
        (item) =>
          !needle ||
          item.label.toLowerCase().includes(needle) ||
          item.key.includes(needle),
      );
    return FEATURE_GROUPS.map((group) => ({
      group,
      items: items.filter((item) => item.group === group),
    })).filter((entry) => entry.items.length > 0);
  }, [data, query, labels]);

  const groupLabel = (group: string) =>
    t.has(`groups.${group}`) ? t(`groups.${group}`) : prettifyKey(group);

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          className="h-10 pl-9 text-base"
          aria-label={t("search")}
        />
      </div>

      {loading && !data ? (
        <ChartSkeleton height="h-96" />
      ) : groups.length === 0 ? (
        <ChartMessage>{t("noResults")}</ChartMessage>
      ) : (
        <ChartCard>
          <div className="space-y-10">
            {!sexFiltered && (
              <div className="text-muted-foreground flex gap-5 text-sm">
                <LegendDot color={colors.men} label={tp("menLegend")} />
                <LegendDot color={colors.women} label={tp("womenLegend")} />
              </div>
            )}
            {groups.map((entry) => (
              <div key={entry.group}>
                <h3 className={`mb-4 ${CHART_TITLE}`}>
                  {groupLabel(entry.group)}
                </h3>
                <PrevalenceRows
                  items={entry.items}
                  split={!sexFiltered}
                  legend={false}
                  note=""
                />
              </div>
            ))}
            <p className="text-muted-foreground text-sm">
              {t("listNote", { cohort: data?.cohort ?? 0 })}
            </p>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
