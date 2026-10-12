"use client";

import { useTranslations } from "next-intl";
import BreakdownSection from "./BreakdownSection";
import { ChartBlock, ChartMessage, ChartSkeleton } from "./ChartParts";
import PrevalenceRows from "./PrevalenceRows";
import { useFilteredJson } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

interface RegretByReasonResponse {
  reasons: { key: string; n: number; regrets: number; stated: number }[];
}

/**
 * Pathways: whether regret differs by the main reason for transitioning,
 * then which medical steps people took (women vs men).
 */
export default function PathwaysSection() {
  const t = useTranslations("statsPage.pathways");

  return (
    <div className="space-y-8">
      <ChartBlock
        title={t("regretByReason.title")}
        description={t("regretByReason.description")}
      >
        <RegretByReason />
      </ChartBlock>
      <BreakdownSection
        view="medical_steps"
        namespace="statsPage.medical_steps"
      />
    </div>
  );
}

function RegretByReason() {
  const t = useTranslations("statsPage.pathways.regretByReason");
  const labels = useFeatureLabels();
  const { data, loading, error } = useFilteredJson<RegretByReasonResponse>(
    "/api/features/regret-by-reason",
  );

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-80" />;
  if (!data || data.reasons.length === 0) {
    return <ChartMessage>{t("empty")}</ChartMessage>;
  }

  const totals = data.reasons.reduce(
    (sum, row) => ({
      regrets: sum.regrets + row.regrets,
      stated: sum.stated + row.stated,
    }),
    { regrets: 0, stated: 0 },
  );

  return (
    <div className="space-y-5">
      {totals.stated > 0 && (
        <p className="text-base">
          {t("headline", {
            percent: Math.round((totals.regrets / totals.stated) * 100),
            n: totals.stated,
          })}
        </p>
      )}
      <PrevalenceRows
        note={t("note")}
        items={data.reasons
          .filter((row) => row.stated > 0)
          .map((row) => ({
            key: `primary_transition_reason:${row.key}`,
            label: labels.option(row.key),
            n: row.stated,
            above: row.regrets,
            stories: false,
          }))}
      />
    </div>
  );
}
