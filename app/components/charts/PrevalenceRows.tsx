"use client";

import { Button } from "@/app/components/ui/button";
import { niceShareMax, SMALL_SAMPLE_N, wilson } from "@/app/lib/stats-math";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useChartColors } from "./chart-theme";
import { useFeatureStories } from "./FeatureStories";

/** A sex gap is only called out above these thresholds. */
const GAP_MIN_SHARE = 0.05;
const GAP_MIN_RATIO = 1.5;

export interface PrevalenceCount {
  n: number;
  above: number;
}

export interface PrevalenceItem extends PrevalenceCount {
  key: string;
  label: string;
  /** Exact question asked, shown under the label. */
  question?: string | null;
  /** Per-sex counts; drawn as two marks when `split` is on. */
  bySex?: { f: PrevalenceCount; m: PrevalenceCount };
  /** Mark colour for single-series rows (e.g. by tier). */
  color?: string;
  /** Set false for rows that are not a yes/no feature (no story lookup). */
  stories?: boolean;
}

interface Mark {
  id: string;
  share: number;
  low: number;
  high: number;
  n: number;
  color: string;
}

/**
 * Ranked yes/no prevalence rows: a dot at the share of stories where the
 * statement is clearly true, with a whisker for its 95% interval. When the
 * cohort is not filtered by sex, women and men get their own marks, since
 * blended numbers mostly describe women (≈72% of accounts).
 *
 * Rows below SMALL_SAMPLE_N answers are faded and labelled with their n.
 * When a stories provider is present, rows open matching stories.
 */
export default function PrevalenceRows({
  items,
  split = false,
  limit,
  sort = true,
  note,
  legend = true,
  hideMore = false,
}: {
  /** Hide the built-in "show all" button (the parent renders its own). */
  hideMore?: boolean;
  /** Show the women / men legend (off when a parent shows one). */
  legend?: boolean;
  /** Replaces the default "how to read this" footnote. */
  note?: string;
  items: PrevalenceItem[];
  split?: boolean;
  /** Show this many rows first, with a "show all" button for the rest. */
  limit?: number;
  sort?: boolean;
}) {
  const t = useTranslations("statsPage.prevalence");
  const colors = useChartColors();
  const openStories = useFeatureStories();
  const [expanded, setExpanded] = useState(false);

  const showSplit = split && items.some((item) => item.bySex);
  const rows = (
    sort ? [...items].sort((a, b) => share(b) - share(a)) : items
  ).map((item) => ({ item, marks: marksFor(item) }));
  const visible =
    limit && !expanded && rows.length > limit ? rows.slice(0, limit) : rows;

  const domainMax = niceShareMax(
    Math.max(0, ...rows.flatMap((row) => row.marks.map((mark) => mark.high))),
  );
  const ticks = [0, domainMax / 2, domainMax];
  const x = (value: number) => `${Math.min(100, (value / domainMax) * 100)}%`;

  function marksFor(item: PrevalenceItem): Mark[] {
    const build = (
      id: string,
      counts: PrevalenceCount,
      color: string,
    ): Mark => {
      const interval = wilson(counts.above, counts.n);
      return {
        id,
        share: counts.n > 0 ? counts.above / counts.n : 0,
        n: counts.n,
        color,
        ...interval,
      };
    };
    if (showSplit && item.bySex) {
      // Men first, matching the "M 26% | F 34%" value label.
      return [
        build("m", item.bySex.m, colors.men),
        build("f", item.bySex.f, colors.women),
      ].filter((mark) => mark.n > 0);
    }
    return [build("all", item, item.color ?? colors.series[0])];
  }

  const percent = (value: number) => `${Math.round(value * 100)}%`;

  // The clearest relative difference between women and men, among rows
  // with enough answers on both sides and a share worth talking about.
  const gap = showSplit
    ? rows
        .map(({ item, marks }) => {
          const f = marks.find((mark) => mark.id === "f");
          const m = marks.find((mark) => mark.id === "m");
          if (!f || !m || f.n < SMALL_SAMPLE_N || m.n < SMALL_SAMPLE_N) {
            return null;
          }
          const higher = Math.max(f.share, m.share);
          if (higher < GAP_MIN_SHARE) return null;
          const lower = Math.min(f.share, m.share);
          // Only when the intervals do not overlap.
          const separated = f.share > m.share ? f.low > m.high : m.low > f.high;
          if (!separated) return null;
          return {
            label: item.label,
            womenHigher: f.share > m.share,
            higher,
            lower,
            ratio: (higher + 0.01) / (lower + 0.01),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry != null)
        .sort((a, b) => b.ratio - a.ratio)[0]
    : null;

  return (
    <div>
      {gap && gap.ratio >= GAP_MIN_RATIO && (
        <p className="mb-4 text-lg">
          {t("gap", {
            label: gap.label,
            higher: percent(gap.higher),
            lower: percent(gap.lower),
            higherGroup: gap.womenHigher ? t("womenLower") : t("menLower"),
            lowerGroup: gap.womenHigher ? t("menLower") : t("womenLower"),
          })}
        </p>
      )}
      {showSplit && legend && (
        <div className="text-muted-foreground mb-3 flex gap-5 text-sm">
          <LegendDot color={colors.men} label={t("menLegend")} />
          <LegendDot color={colors.women} label={t("womenLegend")} />
        </div>
      )}

      <ul>
        {visible.map(({ item, marks }) => {
          const small = marks.some((mark) => mark.n < SMALL_SAMPLE_N);
          const intervalText = marks
            .map((mark) =>
              t("interval", {
                group: showSplit
                  ? mark.id === "f"
                    ? t("women")
                    : t("men")
                  : "",
                percent: percent(mark.share),
                low: percent(mark.low),
                high: percent(mark.high),
                n: mark.n,
              }).trim(),
            )
            .join(" · ");

          const content = (
            <>
              <span className="col-span-2 text-base leading-snug sm:col-span-1">
                {item.label}
                {item.question && (
                  <span className="text-muted-foreground mt-0.5 block text-sm">
                    “{item.question}”
                  </span>
                )}
              </span>
              <span
                className={`relative block ${showSplit ? "h-7" : "h-5"}`}
                aria-hidden
              >
                {ticks.map((tick) => (
                  <span
                    key={tick}
                    className="absolute top-0 bottom-0 w-px"
                    style={{ left: x(tick), background: colors.grid }}
                  />
                ))}
                {marks.map((mark, index) => {
                  const top = showSplit ? (index === 0 ? "30%" : "70%") : "50%";
                  return (
                    <span key={mark.id}>
                      <span
                        className="absolute h-0.5 -translate-y-1/2 rounded-full opacity-50"
                        style={{
                          top,
                          left: x(mark.low),
                          width: `calc(${x(mark.high)} - ${x(mark.low)})`,
                          background: mark.color,
                        }}
                      />
                      <span
                        className="border-background absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                        style={{
                          top,
                          left: x(mark.share),
                          background: mark.color,
                        }}
                      />
                    </span>
                  );
                })}
              </span>
              <span className="text-right text-base tabular-nums">
                {marks.map((mark, index) => (
                  <span key={mark.id}>
                    {index > 0 && (
                      <span className="text-muted-foreground"> | </span>
                    )}
                    {mark.id !== "all" && (
                      <span className="text-muted-foreground">
                        {mark.id === "m" ? t("m") : t("f")}{" "}
                      </span>
                    )}
                    {percent(mark.share)}
                  </span>
                ))}
                {small && (
                  <span className="text-muted-foreground block text-sm">
                    {t("smallSample", {
                      n: Math.min(...marks.map((mark) => mark.n)),
                    })}
                  </span>
                )}
              </span>
            </>
          );

          const className = `grid w-full grid-cols-[1fr_8.5rem] items-center gap-x-4 gap-y-1 py-2 text-left sm:grid-cols-[minmax(10rem,17rem)_1fr_8.5rem] ${
            small ? "opacity-60" : ""
          }`;

          return (
            <li key={item.key} title={intervalText}>
              {openStories && item.stories !== false ? (
                <button
                  type="button"
                  className={`${className} hover:bg-muted/60 -mx-2 cursor-pointer rounded-md px-2`}
                  style={{ width: "calc(100% + 1rem)" }}
                  onClick={() => openStories(item.key, item.label)}
                  aria-label={`${item.label}: ${intervalText}. ${t("openStories")}`}
                >
                  {content}
                </button>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-1 grid grid-cols-[1fr_8.5rem] gap-x-4 sm:grid-cols-[minmax(10rem,17rem)_1fr_8.5rem]">
        <span className="hidden sm:block" />
        <span className="text-muted-foreground relative block h-5 text-sm">
          {ticks.map((tick, index) => (
            <span
              key={tick}
              className={`absolute top-0 tabular-nums ${
                index === 0
                  ? ""
                  : index === ticks.length - 1
                    ? "-translate-x-full"
                    : "-translate-x-1/2"
              }`}
              style={{ left: x(tick) }}
            >
              {percent(tick)}
            </span>
          ))}
        </span>
      </div>

      {!hideMore && limit && rows.length > limit && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t("showFewer") : t("showAll", { count: rows.length })}
        </Button>
      )}

      {note !== "" && (
        <p className="text-muted-foreground mt-4 text-sm">
          {note ?? (openStories ? t("noteWithStories") : t("note"))}
        </p>
      )}
    </div>
  );
}

function share(item: PrevalenceItem): number {
  return item.n > 0 ? item.above / item.n : 0;
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
