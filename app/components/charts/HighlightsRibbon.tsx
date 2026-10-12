"use client";

import { Button } from "@/app/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_SURFACE, SECTION_TITLE } from "./ChartParts";
import {
  MINI_COLORS,
  MiniBars,
  MiniDonut,
  MiniTimeline,
} from "./HighlightMiniChart";
import { buildFeatureParams, prettifyKey } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

type Highlight =
  | {
      type: "prevalence";
      featureKey: string;
      label: string;
      unclearPercent: number;
      tagName: string | null;
      percent: number;
      n: number;
    }
  | {
      type: "regretLadder";
      socialOnly: number;
      hormones: number;
      surgery: number;
      n: number;
    }
  | {
      type: "improvement";
      featureKey: string;
      betterPercent: number;
      worsePercent: number;
      n: number;
    }
  | {
      type: "journey";
      dysphoria: number | null;
      transition: number;
      detransition: number;
      n: number;
    }
  | { type: "orientation"; percent: number; sameSexPercent: number; n: number }
  | { type: "minorShare"; percent: number; n: number; total: number }
  | { type: "minorLe15"; percent: number; n: number }
  | { type: "minorDysphoria"; percent: number; n: number }
  | { type: "minorFemale"; percent: number; n: number };

interface HighlightsResponse {
  cohort: number;
  highlights: Highlight[];
}

/** Anchor id of the ribbon, linked from the stats TOC. */
export const HIGHLIGHTS_ID = "highlights";

/**
 * "What stands out": auto-ranked insight cards above the accordion. Each
 * card opens the relevant section, applying a matching filter where it
 * makes sense.
 */
export default function HighlightsRibbon({
  onOpenSection,
  onVisibleChange,
}: {
  onOpenSection: (id: string) => void;
  /** Reports whether the ribbon is rendered, so the TOC can link to it. */
  onVisibleChange?: (visible: boolean) => void;
}) {
  const t = useTranslations("statsPage.highlights");
  const labels = useFeatureLabels();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<HighlightsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const params = buildFeatureParams(searchParams);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetch(`/api/features/highlights?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as HighlightsResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [params]);

  const explore = (extraParams: Record<string, string>, sectionId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(extraParams)) {
      next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    onOpenSection(sectionId);
  };

  // Skip card types this client has no copy for (e.g. an API that is newer
  // or older than the page), rather than showing raw message keys.
  const highlights = (data?.highlights ?? []).filter((highlight) =>
    t.has(`types.${highlight.type}`),
  );
  const visible = !failed && highlights.length > 0;

  useEffect(() => {
    onVisibleChange?.(visible);
  }, [visible, onVisibleChange]);

  if (!visible) return null;

  const feature = (key: string, fallback: string) =>
    labels.feature(key, fallback || prettifyKey(key));

  const renderBody = (highlight: Highlight) => {
    switch (highlight.type) {
      case "prevalence":
        return (
          <>
            {t("prevalence", {
              label: feature(highlight.featureKey, highlight.label),
              percent: highlight.percent,
              n: highlight.n,
            })}
            {highlight.unclearPercent >= 10 && (
              <span className="text-muted-foreground">
                {" "}
                {t("prevalenceUnclear", {
                  unclear: highlight.unclearPercent,
                })}
              </span>
            )}
          </>
        );
      case "regretLadder":
        // Shares of everyone at each step, not only those who say either
        // way (the medical chart's headline), so flag the silent remainder.
        return (
          <>
            {t("regretLadder", {
              socialOnly: highlight.socialOnly,
              hormones: highlight.hormones,
              surgery: highlight.surgery,
              n: highlight.n,
            })}
            <span className="text-muted-foreground">
              {" "}
              {t("regretLadderNote")}
            </span>
          </>
        );
      case "improvement":
        return t("improvement", {
          better: highlight.betterPercent,
          worse: highlight.worsePercent,
          n: highlight.n,
        });
      case "journey":
        return t("journey", {
          dysphoria: highlight.dysphoria?.toFixed(0) ?? "?",
          transition: highlight.transition.toFixed(0),
          detransition: highlight.detransition.toFixed(0),
          n: highlight.n,
        });
      case "orientation":
        return t("orientation", {
          percent: highlight.percent,
          sameSex: highlight.sameSexPercent,
          n: highlight.n,
        });
      case "minorShare":
        return t("minorShare", {
          percent: highlight.percent,
          n: highlight.n,
          total: highlight.total,
        });
      case "minorLe15":
        return t("minorLe15", {
          percent: highlight.percent,
          n: highlight.n,
        });
      case "minorDysphoria":
        return t("minorDysphoria", {
          percent: highlight.percent,
          n: highlight.n,
        });
      case "minorFemale":
        return t("minorFemale", {
          percent: highlight.percent,
          n: highlight.n,
        });
    }
  };

  const renderChart = (highlight: Highlight) => {
    switch (highlight.type) {
      case "prevalence":
        return (
          <MiniDonut
            primary={highlight.percent}
            secondary={highlight.unclearPercent}
          />
        );
      case "regretLadder":
        return (
          <MiniBars
            values={[
              highlight.socialOnly,
              highlight.hormones,
              highlight.surgery,
            ]}
            colors={[
              MINI_COLORS.SECONDARY,
              MINI_COLORS.PRIMARY,
              MINI_COLORS.PRIMARY,
            ]}
            max={100}
          />
        );
      case "improvement":
        return (
          <MiniBars
            values={[
              highlight.betterPercent,
              Math.max(
                0,
                100 - highlight.betterPercent - highlight.worsePercent,
              ),
              highlight.worsePercent,
            ]}
            colors={[MINI_COLORS.PRIMARY, "#94a3b8", MINI_COLORS.NEGATIVE]}
          />
        );
      case "journey":
        return (
          <MiniTimeline
            ages={[
              highlight.dysphoria,
              highlight.transition,
              highlight.detransition,
            ]}
          />
        );
      case "orientation":
        return (
          <MiniDonut
            primary={highlight.sameSexPercent}
            secondary={highlight.percent - highlight.sameSexPercent}
          />
        );
      case "minorShare":
      case "minorLe15":
      case "minorDysphoria":
        return <MiniDonut primary={highlight.percent} />;
      case "minorFemale":
        return (
          <MiniBars
            values={[highlight.percent, 100 - highlight.percent]}
            colors={[MINI_COLORS.PRIMARY, MINI_COLORS.SECONDARY]}
          />
        );
    }
  };

  const renderAction = (highlight: Highlight) => {
    switch (highlight.type) {
      case "prevalence":
        return () => explore({}, "features");
      case "regretLadder":
        return () => explore({}, "medical");
      case "improvement":
        return () => explore({}, "after");
      case "journey":
        return () => explore({}, "journey");
      case "orientation":
        return () => explore({}, "sexuality");
      case "minorShare":
      case "minorLe15":
      case "minorDysphoria":
      case "minorFemale":
        return () => explore({}, "minors");
    }
  };

  return (
    <div id={HIGHLIGHTS_ID} className="pt-10">
      <h2 className={SECTION_TITLE}>{t("title")}</h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {highlights.map((highlight) => (
          <div
            key={highlight.type}
            className={`relative flex flex-col p-4 ${CARD_SURFACE}`}
          >
            <div className="pointer-events-none absolute right-4 bottom-3">
              {renderChart(highlight)}
            </div>
            <span className="text-base font-semibold">
              {t(`types.${highlight.type}`)}
            </span>
            <p className="text-muted-foreground mt-1 flex-1 text-sm leading-relaxed">
              {renderBody(highlight)}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="mt-2 self-start px-0"
              onClick={renderAction(highlight)}
            >
              {t("explore")}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
