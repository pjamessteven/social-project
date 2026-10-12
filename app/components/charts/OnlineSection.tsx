"use client";

import { useTranslations } from "next-intl";
import BreakdownSection from "./BreakdownSection";
import { ChartBlock } from "./ChartParts";
import ChoiceByYear from "./ChoiceByYear";

/** Platforms coloured in the by-era bars, in fixed order. */
const PLATFORM_OPTIONS = [
  "reddit",
  "youtube",
  "tumblr",
  "discord",
  "twitter",
  "tiktok",
];

/**
 * Online and peer influence: the most influential platform, related
 * statements, and how the platform mix shifted across transition eras.
 */
export default function OnlineSection() {
  const t = useTranslations("statsPage.online");
  return (
    <div className="space-y-8">
      <BreakdownSection view="online" namespace="statsPage.online" />
      <ChartBlock
        title={t("byYear.title")}
        description={t("byYear.description")}
      >
        <ChoiceByYear
          featureKey="platform_primary"
          options={PLATFORM_OPTIONS}
          exclude={["none"]}
        />
      </ChartBlock>
    </div>
  );
}
