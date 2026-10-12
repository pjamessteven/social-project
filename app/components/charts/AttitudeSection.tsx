"use client";

import { useTranslations } from "next-intl";
import { useChartColors } from "./chart-theme";
import { ChartBlock, ChartFootnote } from "./ChartParts";
import OrdinalChoiceBars from "./OrdinalChoiceBars";
import { useFeatureDetail } from "./useFeatureData";

const ORDER = ["supportive", "conditional", "critical", "opposed"];

/**
 * Views on transition for other people, as an ordered scale from
 * supportive to opposed, for everyone and for women and men.
 */
export default function AttitudeSection() {
  const t = useTranslations("statsPage.current_status");
  const colors = useChartColors();
  const { data } = useFeatureDetail("attitude_towards_transition_for_others");

  const addressed = data?.choice?.options.filter((option) =>
    ORDER.includes(option.key),
  );
  const total = addressed?.reduce((sum, option) => sum + option.soft, 0) ?? 0;
  const critical =
    addressed
      ?.filter(
        (option) => option.key === "critical" || option.key === "opposed",
      )
      .reduce((sum, option) => sum + option.soft, 0) ?? 0;

  return (
    <ChartBlock title={t("choice.title")} description={t("choice.description")}>
      <div className="space-y-5">
        {total > 0 && (
          <p className="text-base">
            {t("headline", {
              percent: Math.round((critical / total) * 100),
              n: Math.round(total),
            })}
          </p>
        )}
        <OrdinalChoiceBars
          featureKey="attitude_towards_transition_for_others"
          order={ORDER}
          colors={[
            colors.positive,
            colors.positiveSoft,
            colors.negativeSoft,
            colors.negative,
          ]}
          darkText={colors.isDark ? [] : ["conditional", "critical"]}
          labelOf={(option) =>
            t.has(`choice.options.${option}`)
              ? t(`choice.options.${option}`)
              : option
          }
        />
        <ChartFootnote>{t("note")}</ChartFootnote>
      </div>
    </ChartBlock>
  );
}
