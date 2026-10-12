"use client";

import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  formatRatio,
  niceShareMax,
  riskRatio,
  SMALL_SAMPLE_N,
  wilson,
} from "@/app/lib/stats-math";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useChartColors } from "./chart-theme";
import {
  ChartCard,
  ChartFootnote,
  ChartMessage,
  ChartSkeleton,
  ROW_GROUP_TITLE,
} from "./ChartParts";
import { LegendDot } from "./PrevalenceRows";
import { buildFeatureParams, useFeatureSummary } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

interface CompareFeatureRow {
  key: string;
  label: string;
  group: string;
  tier: string;
  nTrue: number;
  nFalse: number;
  rateTrue: number;
  rateFalse: number;
  diff: number;
}

interface CompareResponse {
  cohort: number;
  split: {
    key: string;
    label: string;
    mode: "feature" | "sex" | "age";
    threshold: number | null;
    nTrue: number;
    nFalse: number;
    filter: "all" | "clear";
    excluded: number;
  };
  features: CompareFeatureRow[];
}

/** Rows need at least this many clear "yes" answers across both halves. */
const MIN_EVENTS = 10;
const TOP_ROWS = 15;
const DEFAULT_SPLIT = "sex";
/** Bookkeeping or definitional features that are never a finding. */
const EXCLUDED_KEYS = new Set([
  "regret_not_applicable",
  "no_detransition_occurred",
  "never_transitioned",
  "only_social_transition",
]);
/** Ratios need this many clear "yes" answers on each side to be shown. */
const MIN_EVENTS_PER_SIDE = 5;

/**
 * Dumbbell comparison: split the cohort by one yes/no feature and show how
 * the prevalence of every other feature differs between the two halves.
 */
export default function CompareSection() {
  const t = useTranslations("statsPage.compare");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const labels = useFeatureLabels();
  const { data: summary } = useFeatureSummary();
  const [splitKey, setSplitKey] = useState(DEFAULT_SPLIT);
  // Feature splits drop the unclear band so both halves are clear-cut.
  const filter = "clear";
  const colors = useChartColors();
  const [showAll, setShowAll] = useState(false);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = buildFeatureParams(searchParams);

  // Deep links, highlights cards and other sections can preselect the split
  // via ?split=; follow URL changes even after the section has been opened.
  useEffect(() => {
    const fromUrl = searchParams.get("split");
    if (fromUrl) {
      setSplitKey((current) => (current === fromUrl ? current : fromUrl));
    }
  }, [searchParams]);

  const changeSplit = (value: string) => {
    setSplitKey(value);
    const next = new URLSearchParams(searchParams.toString());
    next.set("split", value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/features/compare?split=${encodeURIComponent(splitKey)}&mode=${filter}&${params}`,
      {
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as CompareResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (
          cancelled ||
          (err instanceof DOMException && err.name === "AbortError")
        )
          return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [splitKey, params]);

  const noulFeatures = useMemo(
    () =>
      (summary?.features ?? [])
        .filter((feature) => feature.kind === "noul" && feature.n > 0)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [summary],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    // Features from the split feature's own group mostly restate it (e.g.
    // "regrets hormones" when splitting by regret), so leave them out.
    const splitGroup = summary?.features.find(
      (feature) => feature.key === data.split.key,
    )?.group;
    const ranked = data.features
      .filter(
        (row) =>
          !EXCLUDED_KEYS.has(row.key) &&
          row.group !== "quality" &&
          (data.split.mode !== "feature" || row.group !== splitGroup),
      )
      .map((row) => {
        const aboveTrue = Math.round(row.rateTrue * row.nTrue);
        const aboveFalse = Math.round(row.rateFalse * row.nFalse);
        const ratio = riskRatio(aboveTrue, row.nTrue, aboveFalse, row.nFalse);
        return {
          ...row,
          aboveTrue,
          aboveFalse,
          ratio,
          ciTrue: wilson(aboveTrue, row.nTrue),
          ciFalse: wilson(aboveFalse, row.nFalse),
          small: row.nTrue < SMALL_SAMPLE_N || row.nFalse < SMALL_SAMPLE_N,
        };
      })
      .filter(
        (row) =>
          row.ratio != null &&
          (showAll || row.aboveTrue + row.aboveFalse >= MIN_EVENTS),
      )
      // Strongest association first, on the log scale so 3× and ⅓× rank
      // equally; rare features with wide intervals are pulled back by the
      // interval's inner edge.
      .sort(
        (a, b) =>
          strength(b) - strength(a) ||
          Math.abs(Math.log(b.ratio!.ratio)) -
            Math.abs(Math.log(a.ratio!.ratio)),
      );
    return showAll ? ranked : ranked.slice(0, TOP_ROWS);
  }, [data, showAll, summary]);

  const domainMax = niceShareMax(
    Math.max(0, ...rows.flatMap((row) => [row.ciTrue.high, row.ciFalse.high])),
  );
  const x = (value: number) => `${Math.min(100, (value / domainMax) * 100)}%`;
  const pct = (value: number) => `${Math.round(value * 100)}%`;

  const hiddenCount =
    data && !showAll ? Math.max(0, data.features.length - rows.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className={ROW_GROUP_TITLE} htmlFor="compare-split">
          {t("splitLabel")}
        </label>
        <Select value={splitKey} onValueChange={changeSplit}>
          <SelectTrigger id="compare-split" className="h-10 w-72 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sex">{t("splitSex")}</SelectItem>
            <SelectItem value="transition_age">{t("splitAge")}</SelectItem>
            {noulFeatures.map((feature) => (
              <SelectItem key={feature.key} value={feature.key}>
                {labels.feature(feature.key, feature.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <ChartMessage>{t("error")}</ChartMessage>}
      {loading && !data && <ChartSkeleton />}

      {data && (
        <ChartCard>
          <div className="space-y-6">
            <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <LegendDot
                color={colors.series[0]}
                label={
                  data.split.mode === "sex"
                    ? t("cohortWomen", { n: data.split.nTrue })
                    : data.split.mode === "age"
                      ? t("cohortUnder18", { n: data.split.nTrue })
                      : t("cohortTrue", {
                          label: labels.feature(
                            data.split.key,
                            data.split.label,
                          ),
                          n: data.split.nTrue,
                        })
                }
              />
              <LegendDot
                color={colors.series[1]}
                label={
                  data.split.mode === "sex"
                    ? t("cohortMen", { n: data.split.nFalse })
                    : data.split.mode === "age"
                      ? t("cohortAdult", { n: data.split.nFalse })
                      : t("cohortFalse", { n: data.split.nFalse })
                }
              />
            </div>

            {rows.length === 0 ? (
              <ChartMessage>{t("empty")}</ChartMessage>
            ) : (
              <ul>
                {rows.map((row) => {
                  const label = labels.feature(row.key, row.label);
                  const marks = [
                    {
                      id: "true",
                      share: row.rateTrue,
                      ci: row.ciTrue,
                      color: colors.series[0],
                      top: "30%",
                    },
                    {
                      id: "false",
                      share: row.rateFalse,
                      ci: row.ciFalse,
                      color: colors.series[1],
                      top: "70%",
                    },
                  ];
                  return (
                    <li
                      key={row.key}
                      className={`grid grid-cols-[1fr_8.5rem] items-center gap-x-4 gap-y-1 py-2 sm:grid-cols-[minmax(10rem,17rem)_1fr_8.5rem] ${
                        row.small ? "opacity-60" : ""
                      }`}
                      title={t("rowTooltip", {
                        label,
                        pctTrue: Math.round(row.rateTrue * 100),
                        nTrue: row.nTrue,
                        pctFalse: Math.round(row.rateFalse * 100),
                        nFalse: row.nFalse,
                      })}
                    >
                      <span className="col-span-2 text-base leading-snug sm:col-span-1">
                        {label}
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
                        {data.split.mode === "sex" ? (
                          <>
                            <span className="text-muted-foreground">M </span>
                            {pct(row.rateFalse)}
                            <span className="text-muted-foreground"> | </span>
                            <span className="text-muted-foreground">F </span>
                            {pct(row.rateTrue)}
                          </>
                        ) : (
                          <>
                            {pct(row.rateTrue)}
                            <span className="text-muted-foreground"> · </span>
                            {pct(row.rateFalse)}
                          </>
                        )}
                        {row.ratio &&
                          row.aboveTrue >= MIN_EVENTS_PER_SIDE &&
                          row.aboveFalse >= MIN_EVENTS_PER_SIDE && (
                            <span className="text-muted-foreground block text-sm">
                              {t("ratio", {
                                ratio: formatRatio(row.ratio.ratio),
                              })}
                            </span>
                          )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <ChartFootnote>
              {data.split.mode === "feature"
                ? t("clearNote", { excluded: data.split.excluded })
                : data.split.mode === "sex"
                  ? t("sexNote")
                  : t("ageNote")}{" "}
              {t("ratioNote")}
            </ChartFootnote>
          </div>
        </ChartCard>
      )}

      {data && (hiddenCount > 0 || showAll) && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? t("hideSmallSamples") : t("showAll")}
        </Button>
      )}
    </div>
  );
}

/** Ranking key: |log risk ratio| at the interval edge nearest to 1. */
function strength(row: {
  ratio: { ratio: number; low: number; high: number } | null;
}): number {
  if (!row.ratio) return 0;
  if (row.ratio.low > 1) return Math.log(row.ratio.low);
  if (row.ratio.high < 1) return -Math.log(row.ratio.high);
  return 0;
}
