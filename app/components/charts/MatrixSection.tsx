"use client";

import { formatRatio, niceShareMax, wilson } from "@/app/lib/stats-math";
import { useTranslations } from "next-intl";
import { useChartColors } from "./chart-theme";
import {
  ChartBlock,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useFilteredJson } from "./useFeatureData";

interface Finding {
  id: string;
  theme: string;
  predictor: string;
  outcome: string;
  nWith: number;
  withYes: number;
  nWithout: number;
  withoutYes: number;
  ratio: number | null;
  low: number | null;
  high: number | null;
}

interface ConnectionsResponse {
  cohort: number;
  findings: Finding[];
}

const THEMES = ["medical", "helped", "who", "views"] as const;

/**
 * Connections: answers to contested questions ("does starting before 18
 * change regret?"), each shown as how common the outcome is in stories with
 * vs without the factor. Rows where the 95% interval includes "no
 * difference" are labelled as such — the absence of an expected effect is
 * often the most interesting result.
 */
export default function MatrixSection() {
  const t = useTranslations("statsPage.matrix");
  const colors = useChartColors();
  const { data, loading, error } = useFilteredJson<ConnectionsResponse>(
    "/api/features/connections",
  );

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-96" />;
  if (!data || data.findings.length === 0) {
    return <ChartMessage>{t("empty")}</ChartMessage>;
  }

  const rows = data.findings.map((finding) => ({
    ...finding,
    with: finding.withYes / finding.nWith,
    without: finding.withoutYes / finding.nWithout,
    ciWith: wilson(finding.withYes, finding.nWith),
    ciWithout: wilson(finding.withoutYes, finding.nWithout),
    clear:
      finding.low != null &&
      finding.high != null &&
      (finding.low > 1 || finding.high < 1),
  }));
  const domainMax = niceShareMax(
    Math.max(
      ...rows.map((row) => Math.max(row.ciWith.high, row.ciWithout.high)),
    ),
  );
  const x = (value: number) => `${Math.min(100, (value / domainMax) * 100)}%`;
  const pct = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="space-y-8">
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <LegendDot color={colors.series[0]} label={t("legendWith")} />
        <LegendDot color={colors.neutral} label={t("legendWithout")} />
      </div>
      {THEMES.map((theme) => {
        const themed = rows.filter((row) => row.theme === theme);
        if (themed.length === 0) return null;
        return (
          <ChartBlock key={theme} title={t(`themes.${theme}`)}>
            <ul className="space-y-1">
              {themed.map((row) => {
                const marks = [
                  {
                    id: "with",
                    share: row.with,
                    ci: row.ciWith,
                    color: colors.series[0],
                    top: "30%",
                  },
                  {
                    id: "without",
                    share: row.without,
                    ci: row.ciWithout,
                    color: colors.neutral,
                    top: "70%",
                  },
                ];
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-[1fr_8rem] items-center gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[minmax(12rem,19rem)_1fr_8rem]"
                    title={t("rowTooltip", {
                      with: pct(row.with),
                      nWith: row.nWith,
                      without: pct(row.without),
                      nWithout: row.nWithout,
                    })}
                  >
                    <span className="col-span-2 leading-snug sm:col-span-1">
                      <span className="block text-base">
                        {t(`predictors.${row.predictor}`)}
                      </span>
                      <span className="text-muted-foreground block text-sm">
                        → {t(`outcomes.${row.outcome}`)}
                      </span>
                    </span>
                    <span className="relative block h-7" aria-hidden>
                      {[0, domainMax / 2, domainMax].map((tick) => (
                        <span
                          key={tick}
                          className="absolute top-0 bottom-0 w-px"
                          style={{ left: x(tick), background: colors.grid }}
                        />
                      ))}
                      {marks.map((mark) => (
                        <span key={mark.id}>
                          <span
                            className="absolute h-0.5 -translate-y-1/2 rounded-full opacity-50"
                            style={{
                              top: mark.top,
                              left: x(mark.ci.low),
                              width: `calc(${x(mark.ci.high)} - ${x(mark.ci.low)})`,
                              background: mark.color,
                            }}
                          />
                          <span
                            className="border-background absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                            style={{
                              top: mark.top,
                              left: x(mark.share),
                              background: mark.color,
                            }}
                          />
                        </span>
                      ))}
                    </span>
                    <span className="text-right text-base tabular-nums">
                      {pct(row.with)}
                      <span className="text-muted-foreground"> vs </span>
                      {pct(row.without)}
                      <span
                        className={`block text-sm ${
                          row.clear ? "font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {row.clear && row.ratio != null
                          ? t("ratio", { ratio: formatRatio(row.ratio) })
                          : t("noDifference")}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </ChartBlock>
        );
      })}
      <ChartFootnote>{t("note", { cohort: data.cohort })}</ChartFootnote>
    </div>
  );
}
