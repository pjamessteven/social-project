"use client";

import { useTranslations } from "next-intl";
import { ChartBlock } from "./ChartParts";
import DistributionLines from "./DistributionLines";

/**
 * Suicidality in depth: the numeric Jev probabilities for "during
 * transition" and "since detransition", one after the other, each split by
 * current identity status.
 */
export default function SuicidalitySection() {
  const t = useTranslations("statsPage.suicidality");

  return (
    <div className="space-y-8">
      <ChartBlock title={t("during")} description={t("duringDescription")}>
        <DistributionLines featureKey="mh_suicidality_during_transition" />
      </ChartBlock>
      <ChartBlock title={t("since")} description={t("sinceDescription")}>
        <DistributionLines featureKey="mh_suicidality_since_detransition" />
      </ChartBlock>
      <p className="text-muted-foreground text-sm">{t("splitNote")}</p>
    </div>
  );
}
