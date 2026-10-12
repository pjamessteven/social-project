"use client";

import { useTranslations } from "next-intl";
import {
  ChartBlock,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import ChoiceDistribution from "./ChoiceDistribution";
import ChoiceSplitBars from "./ChoiceSplitBars";
import { useFeatureDetail, useSexFiltered } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

/**
 * Ranked bars for the two "primary reason" choice questions, one after the
 * other. Jev returns a probability for every option, so the bars show the
 * full distribution rather than one slice per story.
 */
export default function ReasonsSection() {
  const t = useTranslations("statsPage.reasons");
  return (
    <div className="space-y-8">
      <ReasonChart
        featureKey="primary_transition_reason"
        title={t("transitionTitle")}
        description={t("transitionDescription")}
      />
      <ReasonChart
        featureKey="primary_detransition_reason"
        title={t("detransitionTitle")}
        description={t("detransitionDescription")}
      />
    </div>
  );
}

function ReasonChart({
  featureKey,
  title,
  description,
}: {
  featureKey: string;
  title: string;
  description: string;
}) {
  const t = useTranslations("statsPage.features");
  const labels = useFeatureLabels();
  const sexFiltered = useSexFiltered();
  const { data, loading, error } = useFeatureDetail(featureKey);

  return (
    <ChartBlock title={title} description={description}>
      {error && <ChartMessage>{t("error")}</ChartMessage>}
      {loading && !data && <ChartSkeleton height="h-80" />}
      {data?.choice && (
        <>
          {sexFiltered ? (
            <ChoiceDistribution
              options={data.choice.options.map((option) => ({
                key: option.key,
                label: labels.option(option.key),
                description: option.description,
                soft: option.soft,
                hard: option.hard,
              }))}
              total={data.n}
            />
          ) : (
            <ChoiceSplitBars featureKey={featureKey} />
          )}
          <ChartFootnote>
            {t("coverageNote", {
              n: data.n,
              cohort: data.cohort,
              percent:
                data.cohort > 0 ? Math.round((data.n / data.cohort) * 100) : 0,
            })}
          </ChartFootnote>
        </>
      )}
    </ChartBlock>
  );
}
