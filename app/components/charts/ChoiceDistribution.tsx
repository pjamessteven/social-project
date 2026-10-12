"use client";

import { useTranslations } from "next-intl";
import { useChartColors } from "./chart-theme";

export interface ChoiceSeriesOption {
  key: string;
  label: string;
  description?: string | null;
  soft: number;
  hard: number;
}

interface ChoiceDistributionProps {
  options: ChoiceSeriesOption[];
  /** Number of answers the shares are computed against. */
  total: number;
  /**
   * "soft" sums each story's probability per option (default: a story that
   * is 60/40 counts as 0.6 and 0.4); "hard" counts each story's top answer.
   */
  mode?: "soft" | "hard";
  /** Option keys rendered in a muted colour (unclear / other). */
  mutedKeys?: string[];
  /** Rank options by share (default); false keeps the given order. */
  sort?: boolean;
  /** Show the soft/hard counting footnote (default true). */
  showNote?: boolean;
}

/**
 * Ranked horizontal bars for a choice feature (transition reasons etc.),
 * drawn in HTML so long option labels wrap at a readable size.
 */
export default function ChoiceDistribution({
  options,
  total,
  mode = "soft",
  mutedKeys = [],
  sort = true,
  showNote = true,
}: ChoiceDistributionProps) {
  const t = useTranslations("statsPage.features.choice");
  const colors = useChartColors();

  const data = options
    .map((option) => {
      const value = mode === "soft" ? option.soft : option.hard;
      return {
        ...option,
        value,
        share: total > 0 ? value / total : 0,
        muted: mutedKeys.includes(option.key) || option.key.startsWith("other"),
      };
    })
    .filter((option) => option.value > 0)
    .sort((a, b) => {
      if (!sort) return 0;
      // "Other / unclear" always sinks to the bottom.
      if (a.muted !== b.muted) return a.muted ? 1 : -1;
      return b.value - a.value;
    });

  const max = Math.max(0.01, ...data.map((option) => option.share));

  return (
    <div>
      <ul>
        {data.map((option) => {
          const percent = Math.round(option.share * 100);
          return (
            <li
              key={option.key}
              className="grid grid-cols-[1fr_3.5rem] items-center gap-x-4 gap-y-1 py-1.5 sm:grid-cols-[minmax(10rem,16rem)_1fr_3.5rem]"
              title={[
                option.description,
                mode === "soft"
                  ? t("softTooltip", {
                      percent,
                      count: option.soft.toFixed(1),
                    })
                  : t("hardTooltip", { percent, count: option.hard }),
              ]
                .filter(Boolean)
                .join("\n")}
            >
              <span
                className={`col-span-2 text-base sm:col-span-1 ${
                  option.muted ? "text-muted-foreground" : ""
                }`}
              >
                {option.label}
              </span>
              <span className="block h-4" aria-hidden>
                <span
                  className="block h-full rounded-r"
                  style={{
                    width: `${Math.max(0.5, (option.share / max) * 100)}%`,
                    background: option.muted
                      ? colors.neutral
                      : colors.series[0],
                  }}
                />
              </span>
              <span className="text-right text-base tabular-nums">
                {percent}%
              </span>
            </li>
          );
        })}
      </ul>
      {showNote && (
        <p className="text-muted-foreground mt-3 text-sm">
          {mode === "soft" ? t("softNote") : t("hardNote")}
        </p>
      )}
    </div>
  );
}
