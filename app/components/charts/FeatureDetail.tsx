"use client";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ArrowUpRight, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ChoiceDistribution from "./ChoiceDistribution";
import CoverageNote from "./CoverageNote";
import NoulHistogram from "./NoulHistogram";
import ScoreDistribution from "./ScoreDistribution";
import { useFeatureDetail, type FeatureDetailResponse } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

interface FeatureDetailProps {
  featureKey: string;
  onSelectFeature?: (key: string) => void;
  onFilterByTag?: (tagName: string) => void;
}

export default function FeatureDetail({
  featureKey,
  onSelectFeature,
  onFilterByTag,
}: FeatureDetailProps) {
  const t = useTranslations("statsPage.features");
  const labels = useFeatureLabels();
  const { data, loading, error } = useFeatureDetail(featureKey);
  const [showQuestion, setShowQuestion] = useState(false);

  if (error) {
    return (
      <div className="text-muted-foreground p-4 text-sm">
        {t("error")}: {error}
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-3 p-1">
        <div className="bg-muted h-6 w-2/3 animate-pulse rounded" />
        <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
        <div className="bg-muted h-48 w-full animate-pulse rounded" />
      </div>
    );
  }

  if (!data) return null;

  const { feature, noul, choice, score, confidence, related } = data;
  const kindLabel = t.has(`kinds.${feature.kind}`)
    ? t(`kinds.${feature.kind}`)
    : feature.kind;
  const tierLabel = t.has(`tiers.${feature.tier}`)
    ? t(`tiers.${feature.tier}`)
    : feature.tier;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">
            {labels.feature(feature.key, feature.label)}
          </h3>
          <Badge variant="secondary" className="text-sm">
            {kindLabel}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {tierLabel}
          </Badge>
        </div>
        <CoverageNote n={data.n} cohort={data.cohort} className="mt-1" />
        {feature.question.instructions && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowQuestion((value) => !value)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm underline underline-offset-4"
            >
              <Info className="h-3 w-3" />
              {t("question")}
            </button>
            {showQuestion && (
              <p className="text-muted-foreground mt-1 text-sm">
                {feature.question.instructions}
              </p>
            )}
          </div>
        )}
      </div>

      {feature.kind === "noul" && noul && <NoulDetail data={data} />}

      {feature.kind === "choice" && choice && (
        <div className="space-y-3">
          <ChoiceDistribution
            options={choice.options.map((option) => ({
              key: option.key,
              label: labels.option(option.key),
              description: option.description,
              soft: option.soft,
              hard: option.hard,
            }))}
            total={data.n}
          />
        </div>
      )}

      {feature.kind === "score" && score && (
        <div className="space-y-3">
          {score.mean != null && (
            <p className="text-2xl font-semibold">
              {t("score.meanLabel", {
                value: score.mean.toFixed(1),
                max: score.max,
              })}
            </p>
          )}
          <ScoreDistribution
            bins={score.bins}
            levels={score.levels}
            min={score.min}
            max={score.max}
            mean={score.mean}
          />
        </div>
      )}

      {typeof confidence?.median === "number" && (
        <p className="text-muted-foreground text-sm">
          {t("confidence", {
            value: Math.round((confidence.median ?? 0) * 100),
          })}
        </p>
      )}

      {feature.tagName && onFilterByTag && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onFilterByTag(feature.tagName!)}
        >
          {t("filterByTag", { tag: feature.tagName })}
        </Button>
      )}

      {related.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">{t("related.title")}</p>
          <ul className="space-y-1">
            {related.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onSelectFeature?.(item.key)}
                  className="hover:bg-muted flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowUpRight className="text-muted-foreground h-3.5 w-3.5" />
                    {labels.feature(item.key, item.label)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {t("related.lift", {
                      lift: (item.lift ?? 1).toFixed(1),
                      percent: Math.round(item.rate * 100),
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.n === 0 && (
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      )}
    </div>
  );
}

function NoulDetail({ data }: { data: FeatureDetailResponse }) {
  const t = useTranslations("statsPage.features");
  const noul = data.noul!;
  const prevalence = noul.nValues > 0 ? noul.nAbove / noul.nValues : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-4xl font-semibold">
          {Math.round(prevalence * 100)}%
        </span>
        <span className="text-muted-foreground text-sm">
          {t("noul.prevalenceLabel")}
        </span>
      </div>
      <NoulHistogram
        buckets={noul.buckets}
        threshold={data.feature.threshold}
        total={noul.nValues}
      />
      <div className="text-muted-foreground grid grid-cols-3 gap-2 text-sm">
        <span>
          {t("noul.above")}:{" "}
          <strong className="text-foreground">{noul.nAbove}</strong>
        </span>
        <span>
          {t("noul.uncertain")}:{" "}
          <strong className="text-foreground">{noul.nUncertain}</strong>
        </span>
        <span>
          {t("noul.below")}:{" "}
          <strong className="text-foreground">{noul.nBelow}</strong>
        </span>
      </div>
    </div>
  );
}
