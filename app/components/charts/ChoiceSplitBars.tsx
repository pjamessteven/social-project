"use client";

import { useTranslations } from "next-intl";
import { useChartColors } from "./chart-theme";
import { ChartFootnote, ChartMessage, ChartSkeleton } from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useFilteredJson } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

interface ChoiceBySexResponse {
  key: string;
  groups: Record<"f" | "m", { n: number; soft: Record<string, number> }>;
}

/** Options need this share in at least one group to drive the headline. */
const HEADLINE_MIN_SHARE = 0.04;

/**
 * A choice feature for women and men side by side: two thin bars per
 * option, ranked by the combined share, with "other / unclear" last. A
 * headline names the options where the sexes differ most.
 */
export default function ChoiceSplitBars({
  featureKey,
}: {
  featureKey: string;
}) {
  const t = useTranslations("statsPage.choiceSplit");
  const labels = useFeatureLabels();
  const colors = useChartColors();
  const { data, loading, error } = useFilteredJson<ChoiceBySexResponse>(
    `/api/features/choice-by-sex?key=${encodeURIComponent(featureKey)}`,
  );

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-96" />;
  if (!data || data.groups.f.n + data.groups.m.n === 0) {
    return <ChartMessage>{t("empty")}</ChartMessage>;
  }

  const { f, m } = data.groups;
  const shareOf = (
    group: { n: number; soft: Record<string, number> },
    key: string,
  ) => (group.n > 0 ? (group.soft[key] ?? 0) / group.n : 0);
  const options = [...new Set([...Object.keys(f.soft), ...Object.keys(m.soft)])]
    .map((key) => ({
      key,
      women: shareOf(f, key),
      men: shareOf(m, key),
      muted: key.startsWith("other"),
    }))
    .filter((option) => option.women + option.men > 0.002)
    .sort((a, b) => {
      if (a.muted !== b.muted) return a.muted ? 1 : -1;
      return b.women * f.n + b.men * m.n - (a.women * f.n + a.men * m.n);
    });
  const max = Math.max(0.01, ...options.flatMap((o) => [o.women, o.men]));

  // Headline: the clearest relative difference in each direction.
  const candidates = options.filter(
    (option) =>
      !option.muted && Math.max(option.women, option.men) >= HEADLINE_MIN_SHARE,
  );
  const ratio = (a: number, b: number) => (a + 0.005) / (b + 0.005);
  const womenLead = [...candidates].sort(
    (a, b) => ratio(b.women, b.men) - ratio(a.women, a.men),
  )[0];
  const menLead = [...candidates].sort(
    (a, b) => ratio(b.men, b.women) - ratio(a.men, a.women),
  )[0];
  const pct = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="space-y-5">
      {womenLead && menLead && womenLead.key !== menLead.key && (
        <p className="text-base">
          {t("headline", {
            womenOption: labels.option(womenLead.key),
            womenShare: pct(womenLead.women),
            womenMen: pct(womenLead.men),
            menOption: labels.option(menLead.key),
            menShare: pct(menLead.men),
            menWomen: pct(menLead.women),
          })}
        </p>
      )}
      <div className="text-muted-foreground flex gap-5 text-sm">
        <LegendDot color={colors.men} label={t("men", { n: m.n })} />
        <LegendDot color={colors.women} label={t("women", { n: f.n })} />
      </div>
      <ul>
        {options.map((option) => (
          <li
            key={option.key}
            className="grid grid-cols-[1fr_8.5rem] items-center gap-x-4 gap-y-1 py-1.5 sm:grid-cols-[minmax(10rem,16rem)_1fr_8.5rem]"
          >
            <span
              className={`col-span-2 text-base leading-snug sm:col-span-1 ${
                option.muted ? "text-muted-foreground" : ""
              }`}
            >
              {labels.option(option.key)}
            </span>
            <span className="flex flex-col gap-1" aria-hidden>
              {(["men", "women"] as const).map((group) => (
                <span key={group} className="block h-2.5">
                  <span
                    className="block h-full rounded-r"
                    style={{
                      width: `${Math.max(0.5, (option[group] / max) * 100)}%`,
                      background: option.muted
                        ? colors.neutral
                        : group === "women"
                          ? colors.women
                          : colors.men,
                    }}
                  />
                </span>
              ))}
            </span>
            <span className="text-right text-base tabular-nums">
              <span className="text-muted-foreground">{t("m")} </span>
              {pct(option.men)}
              <span className="text-muted-foreground"> | </span>
              <span className="text-muted-foreground">{t("f")} </span>
              {pct(option.women)}
            </span>
          </li>
        ))}
      </ul>
      <ChartFootnote>{t("note")}</ChartFootnote>
    </div>
  );
}
