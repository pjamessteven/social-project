"use client";

import { SMALL_SAMPLE_N } from "@/app/lib/stats-math";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { useChartColors } from "./chart-theme";
import {
  ChartBlock,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
} from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { useFilteredJson, useSexFiltered } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

type Counts = Record<string, number>;

interface SexualityResponse {
  cohort: number;
  orientations: string[];
  stated: { before: number; after: number; both: number };
  before: { f: Counts; m: Counts };
  after: { f: Counts; m: Counts };
  matrix: Record<string, Counts>;
  statements: {
    key: string;
    label: string;
    n: number;
    above: number;
    bySex: {
      f: { n: number; above: number };
      m: { n: number; above: number };
    };
  }[];
}

const SAME_SEX_OR_BI = ["homosexual", "bisexual"];

const total = (counts: Counts) =>
  Object.values(counts).reduce((sum, value) => sum + value, 0);
const share = (counts: Counts, keys: string[]) => {
  const n = total(counts);
  return n > 0 ? keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0) / n : 0;
};
const addCounts = (a: Counts, b: Counts): Counts =>
  Object.fromEntries(
    Object.keys(a).map((key) => [key, (a[key] ?? 0) + (b[key] ?? 0)]),
  );

/**
 * Sexual orientation (relative to birth sex), among stories that state it:
 * the headline share who are gay, lesbian or bisexual, the full mix for
 * women and men, how orientation before transition compares with after
 * detransition, and related statements.
 */
export default function SexualitySection() {
  const t = useTranslations("statsPage.sexuality");
  const labels = useFeatureLabels();
  const sexFiltered = useSexFiltered();
  const { data, loading, error } = useFilteredJson<SexualityResponse>(
    "/api/features/sexuality-flow",
  );

  if (error) return <ChartMessage>{t("error")}</ChartMessage>;
  if (loading && !data) return <ChartSkeleton height="h-96" />;
  if (!data || data.stated.after + data.stated.before === 0) {
    return <ChartMessage>{t("empty")}</ChartMessage>;
  }

  const afterAll = addCounts(data.after.f, data.after.m);
  const lgb = share(afterAll, SAME_SEX_OR_BI);
  const pct = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="space-y-8">
      <ChartBlock>
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
          <p className="text-6xl font-semibold tracking-tight tabular-nums">
            {pct(lgb)}
          </p>
          <div className="space-y-2">
            <p className="text-base">
              {t("hero.statement", { n: total(afterAll) })}
            </p>
            {!sexFiltered && (
              <p className="text-muted-foreground text-base">
                {t("hero.bySex", {
                  women: pct(share(data.after.f, SAME_SEX_OR_BI)),
                  womenSame: pct(share(data.after.f, ["homosexual"])),
                  men: pct(share(data.after.m, SAME_SEX_OR_BI)),
                  menSame: pct(share(data.after.m, ["homosexual"])),
                })}
              </p>
            )}
          </div>
        </div>
      </ChartBlock>

      <ChartBlock title={t("mix.title")} description={t("mix.description")}>
        <OrientationMix data={data} sexFiltered={sexFiltered} />
      </ChartBlock>

      <ChartBlock
        title={t("matrix.title")}
        description={t("matrix.description")}
      >
        <BeforeAfterTable data={data} />
      </ChartBlock>

      <ChartFootnote>
        {t("coverage", {
          before: data.stated.before,
          after: data.stated.after,
          cohort: data.cohort,
        })}
      </ChartFootnote>
    </div>
  );
}

/** 100% stacked bars: before transition and after detransition, by sex. */
function OrientationMix({
  data,
  sexFiltered,
}: {
  data: SexualityResponse;
  sexFiltered: boolean;
}) {
  const t = useTranslations("statsPage.sexuality");
  const colors = useChartColors();
  const colorOf = (option: string) =>
    option === "other"
      ? colors.neutral
      : colors.series[data.orientations.indexOf(option)];

  const groups = sexFiltered
    ? [{ key: "all", label: t("mix.all"), counts: data.after, base: "all" }]
    : [
        { key: "f", label: t("mix.women"), counts: data.after, base: "f" },
        { key: "m", label: t("mix.men"), counts: data.after, base: "m" },
      ];

  const rows = groups.flatMap((group) =>
    (["before", "after"] as const).map((phase) => {
      const source = data[phase];
      const counts =
        group.base === "all"
          ? addCounts(source.f, source.m)
          : source[group.base as "f" | "m"];
      return {
        key: `${group.key}-${phase}`,
        label: group.label,
        phase: t(`mix.${phase}`),
        counts,
        n: total(counts),
      };
    }),
  );

  return (
    <div className="space-y-5">
      <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {data.orientations.map((option) => (
          <LegendDot
            key={option}
            color={colorOf(option)}
            label={t(`options.${option}`)}
          />
        ))}
      </div>
      <ul className="space-y-4">
        {rows.map((row) => (
          <li
            key={row.key}
            className={`grid gap-2 sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-4 ${
              row.n < SMALL_SAMPLE_N ? "opacity-60" : ""
            }`}
          >
            <span className="text-base">
              {row.label} · {row.phase}
              <span className="text-muted-foreground block text-sm">
                n = {row.n}
              </span>
            </span>
            <span className="flex h-9 w-full gap-0.5 overflow-hidden rounded">
              {data.orientations.map((option) => {
                const value = row.n > 0 ? (row.counts[option] ?? 0) / row.n : 0;
                if (value <= 0) return null;
                const light = option !== "homosexual" && option !== "bisexual";
                return (
                  <span
                    key={option}
                    className={`flex items-center justify-center text-sm font-medium tabular-nums ${
                      light ? "text-slate-900" : "text-white"
                    }`}
                    style={{
                      width: `${value * 100}%`,
                      background: colorOf(option),
                    }}
                    title={`${row.label} · ${row.phase} · ${t(`options.${option}`)}: ${Math.round(value * 100)}% (${row.counts[option]})`}
                  >
                    {value >= 0.08 ? `${Math.round(value * 100)}%` : ""}
                  </span>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Before x after table, each row as percentages of that row: "of people who
 * were X before transitioning, what are they after detransitioning?".
 * The diagonal (no change) is emphasised.
 */
function BeforeAfterTable({ data }: { data: SexualityResponse }) {
  const t = useTranslations("statsPage.sexuality");
  const colors = useChartColors();
  const options = data.orientations;
  const stayed = options.reduce(
    (sum, option) => sum + (data.matrix[option]?.[option] ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {data.stated.both > 0 && (
        <p className="text-base">
          {t("matrix.headline", {
            percent: Math.round((stayed / data.stated.both) * 100),
            n: data.stated.both,
          })}
        </p>
      )}
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[36rem] gap-0.5"
          style={{
            gridTemplateColumns: `minmax(9rem, 12rem) repeat(${options.length}, minmax(4.5rem, 1fr))`,
          }}
          role="grid"
        >
          <div className="text-muted-foreground pb-2 text-sm">
            {t("matrix.corner")}
          </div>
          {options.map((option) => (
            <div
              key={option}
              role="columnheader"
              className="text-muted-foreground pb-2 text-center text-sm font-medium"
            >
              {t(`options.${option}`)}
            </div>
          ))}
          {options.map((from) => {
            const row = data.matrix[from] ?? {};
            const n = total(row);
            return (
              <Fragment key={from}>
                <div role="rowheader" className="flex items-center text-base">
                  <span>
                    {t(`options.${from}`)}
                    <span className="text-muted-foreground block text-sm">
                      n = {n}
                    </span>
                  </span>
                </div>
                {options.map((to) => {
                  const value = n > 0 ? (row[to] ?? 0) / n : 0;
                  const masked = n < SMALL_SAMPLE_N;
                  const diagonal = from === to;
                  const alpha = Math.round((0.08 + value * 0.85) * 255)
                    .toString(16)
                    .padStart(2, "0");
                  return (
                    <div
                      key={to}
                      role="gridcell"
                      title={t("matrix.cell", {
                        from: t(`options.${from}`),
                        to: t(`options.${to}`),
                        percent: Math.round(value * 100),
                        count: row[to] ?? 0,
                      })}
                      className={`flex h-12 items-center justify-center rounded-sm text-base tabular-nums ${
                        diagonal ? "font-semibold" : ""
                      } ${masked ? "text-muted-foreground" : value > 0.55 ? "text-white" : "text-foreground"}`}
                      style={{
                        background: masked
                          ? "transparent"
                          : `${colors.series[0]}${alpha}`,
                      }}
                    >
                      {masked ? "–" : `${Math.round(value * 100)}%`}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
      <ChartFootnote>{t("matrix.note")}</ChartFootnote>
    </div>
  );
}
