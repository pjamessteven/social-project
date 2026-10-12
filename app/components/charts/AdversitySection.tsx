"use client";

import { useTranslations } from "next-intl";
import BreakdownSection from "./BreakdownSection";
import { ChartBlock, ChartSkeleton } from "./ChartParts";
import PrevalenceRows, { type PrevalenceItem } from "./PrevalenceRows";
import { useFeatureDetail, useFeatureSummary } from "./useFeatureData";

/**
 * Trauma and adversity: how many stories describe a trauma history versus
 * how many name trauma as the main reason they transitioned or detransitioned,
 * followed by the individual adversity types.
 */
export default function AdversitySection() {
  const t = useTranslations("statsPage.adversity");
  return (
    <div className="space-y-8">
      <ChartBlock
        title={t("contrast.title")}
        description={t("contrast.description")}
      >
        <TraumaContrast />
      </ChartBlock>
      <BreakdownSection view="adversity" namespace="statsPage.adversity" />
    </div>
  );
}

function TraumaContrast() {
  const t = useTranslations("statsPage.adversity.contrast");
  const { data: summary } = useFeatureSummary();
  const { data: transition } = useFeatureDetail("primary_transition_reason");
  const { data: detransition } = useFeatureDetail(
    "primary_detransition_reason",
  );

  const history = summary?.features.find(
    (feature) => feature.key === "adv_trauma_history",
  );
  if (!history || !transition?.choice || !detransition?.choice) {
    return <ChartSkeleton height="h-36" />;
  }

  const hardCount = (options: { key: string; hard: number }[], key: string) =>
    options.find((option) => option.key === key)?.hard ?? 0;

  const items: PrevalenceItem[] = [
    {
      key: "adv_trauma_history",
      label: t("history"),
      n: history.n,
      above: history.nAbove,
    },
    {
      key: "primary_transition_reason:trauma",
      label: t("transitionReason"),
      n: transition.choice.nChoice,
      above: hardCount(transition.choice.options, "trauma"),
      stories: false,
    },
    {
      key: "primary_detransition_reason:trauma_realisation",
      label: t("detransitionReason"),
      n: detransition.choice.nChoice,
      above: hardCount(detransition.choice.options, "trauma_realisation"),
      stories: false,
    },
  ];

  return <PrevalenceRows items={items} sort={false} note={t("note")} />;
}
