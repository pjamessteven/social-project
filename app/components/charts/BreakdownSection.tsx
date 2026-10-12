"use client";

import { breakdownById } from "@/app/lib/feature-breakdowns";
import { useTranslations } from "next-intl";
import { useChartColors } from "./chart-theme";
import {
  ChartBlock,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import ChoiceDistribution from "./ChoiceDistribution";
import PrevalenceRows, {
  LegendDot,
  type PrevalenceItem,
} from "./PrevalenceRows";
import { prettifyKey, useFilteredJson, useSexFiltered } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

interface ChoiceOption {
  key: string;
  hard: number;
  soft: number;
  description: string | null;
}

interface StatementRow {
  key: string;
  label: string;
  question: string | null;
  n: number;
  above: number;
  bySex: {
    f: { n: number; above: number };
    m: { n: number; above: number };
  };
}

interface BreakdownResponse {
  cohort: number;
  composition: {
    mode: "pair" | "any";
    positiveKey?: string;
    negativeKey?: string;
    positive: number;
    negative: number;
    notStated: number;
    n: number;
  } | null;
  scale: {
    key: string;
    n: number;
    mean: number | null;
    maxLevel: number;
    criteria: string[];
    softLevels: number[];
    hardLevels: number[];
  } | null;
  choice: { n: number; options: ChoiceOption[] } | null;
  secondaryChoice: { n: number; options: ChoiceOption[] } | null;
  statements: StatementRow[];
}

/**
 * Config-driven breakdown section: composition line, optional numeric scale,
 * optional choice distributions and ranked yes/no statements (split by sex).
 * See app/lib/feature-breakdowns.ts for the views that use it.
 */
export default function BreakdownSection({
  view,
  namespace,
}: {
  view: string;
  namespace: string;
}) {
  const t = useTranslations(namespace);
  const labels = useFeatureLabels();
  const colors = useChartColors();
  const sexFiltered = useSexFiltered();
  const { data, loading, error } = useFilteredJson<BreakdownResponse>(
    `/api/features/breakdown?view=${encodeURIComponent(view)}`,
  );

  const config = breakdownById(view);

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton />;
  if (!data) return null;

  const { composition, scale, choice, secondaryChoice, statements } = data;
  if (
    !composition &&
    !scale &&
    !choice &&
    !secondaryChoice &&
    statements.length === 0
  ) {
    return <ChartMessage>{t("empty")}</ChartMessage>;
  }

  const percent = (value: number, n: number) =>
    n > 0 ? Math.round((value / n) * 100) : 0;

  const optionLabel = (key: string) =>
    t.has(`choice.options.${key}`)
      ? t(`choice.options.${key}`)
      : labels.option(key) || prettifyKey(key);

  const renderChoice = (
    distribution: { n: number; options: ChoiceOption[] },
    title: string,
  ) => {
    const excluded = new Set(config?.choiceExclude ?? []);
    const kept = distribution.options.filter(
      (option) => !excluded.has(option.key),
    );
    const total = kept.reduce((sum, option) => sum + option.soft, 0);
    return (
      <ChartBlock
        title={title}
        description={
          t.has("choice.description") ? t("choice.description") : undefined
        }
      >
        <ChoiceDistribution
          options={kept.map((option) => ({
            key: option.key,
            label: optionLabel(option.key),
            description: option.description,
            soft: option.soft,
            hard: option.hard,
          }))}
          total={excluded.size > 0 ? total : distribution.n}
        />
      </ChartBlock>
    );
  };

  const scalePalette =
    config?.scaleTone === "support"
      ? [
          colors.negative,
          colors.negativeSoft,
          colors.midpoint,
          colors.positiveSoft,
          colors.positive,
        ]
      : // Severity: one hue, light -> dark.
        colors.isDark
        ? ["#2c2c2a", "#1c5cab", "#3987e5", "#86b6ef"]
        : ["#cde2fb", "#86b6ef", "#2a78d6", "#184f95"];

  const statementItems: PrevalenceItem[] = statements.map((row) => ({
    key: row.key,
    label: labels.feature(row.key, row.label),
    question: row.question,
    n: row.n,
    above: row.above,
    bySex: row.bySex,
  }));

  return (
    <div className="space-y-8">
      {composition && (
        <p className="text-base">
          {composition.mode === "pair"
            ? t("composition.pair", {
                positiveLabel: labels.feature(
                  composition.positiveKey ?? "",
                  "",
                ),
                negativeLabel: labels.feature(
                  composition.negativeKey ?? "",
                  "",
                ),
                positive: percent(composition.positive, composition.n),
                negative: percent(composition.negative, composition.n),
                notStated: percent(composition.notStated, composition.n),
                n: composition.n,
                statedShare: percent(
                  composition.positive,
                  composition.positive + composition.negative,
                ),
                stated: composition.positive + composition.negative,
              })
            : t("composition.any", {
                positive: percent(composition.positive, composition.n),
                n: composition.n,
              })}
        </p>
      )}

      {scale && (
        <ChartBlock title={t("scale.title")}>
          <div>
            <div className="flex h-10 w-full gap-0.5 overflow-hidden rounded">
              {scale.softLevels.map((value, index) => {
                const total = scale.softLevels.reduce((a, b) => a + b, 0);
                const share = total > 0 ? (value / total) * 100 : 0;
                if (share === 0) return null;
                const fill =
                  scalePalette[Math.min(index, scalePalette.length - 1)];
                const darkFill =
                  config?.scaleTone === "support"
                    ? index !== 2
                    : colors.isDark || index >= 2;
                return (
                  <span
                    key={index}
                    className={`flex items-center justify-center text-sm font-medium tabular-nums ${
                      darkFill ? "text-white" : "text-slate-900"
                    }`}
                    style={{ width: `${share}%`, background: fill }}
                    title={`${scale.criteria[index] ?? index}: ${Math.round(share)}%`}
                  >
                    {share >= 9 ? `${Math.round(share)}%` : ""}
                  </span>
                );
              })}
            </div>
            <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {Array.from({ length: scale.maxLevel + 1 }, (_, index) => (
                <LegendDot
                  key={index}
                  color={scalePalette[Math.min(index, scalePalette.length - 1)]}
                  label={
                    t.has(`scale.levels.level${index}`)
                      ? t(`scale.levels.level${index}`)
                      : (scale.criteria[index] ?? String(index))
                  }
                />
              ))}
            </div>
            <ChartFootnote>
              <span className="mt-2 block">
                {scale.mean != null &&
                  `${t("scale.mean", {
                    value: scale.mean.toFixed(1),
                    max: scale.maxLevel,
                  })} · `}
                {t("count", { n: scale.n })}
              </span>
            </ChartFootnote>
          </div>
        </ChartBlock>
      )}

      {choice && renderChoice(choice, t("choice.title"))}
      {secondaryChoice &&
        renderChoice(secondaryChoice, t("secondaryChoice.title"))}

      {statementItems.length > 0 && (
        <ChartBlock
          title={t("statements.title")}
          description={
            t.has("statements.description")
              ? t("statements.description")
              : undefined
          }
        >
          <PrevalenceRows
            items={statementItems}
            split={!sexFiltered}
            sort={!config?.keepOrder}
          />
        </ChartBlock>
      )}

      <ChartFootnote>{t("basedOn", { cohort: data.cohort })}</ChartFootnote>
    </div>
  );
}
