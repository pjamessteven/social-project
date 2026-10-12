"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartBlock, ChartSkeleton } from "./ChartParts";
import { formatYearBucket } from "./ChoiceByYear";
import PrevalenceRows from "./PrevalenceRows";
import { buildFeatureParams } from "./useFeatureData";

interface MinorResponse {
  cohort: number;
  coverage: { withAge: number; total: number };
  byEra: {
    key: string;
    from: number | null;
    to: number | null;
    n: number;
    minors: number;
  }[];
  tiles: {
    minorShare: number;
    le15Share: number;
    dysphoriaShare: number;
    dysphoriaN: number;
    femaleMinorShare: number;
    blockers: { n: number; min: number | null; median: number | null };
    hormonesLe16: number;
    hormonesN: number;
    detransitionLe18: number;
    detransitionN: number;
  };
}

/**
 * "Transition before 18": age coverage and early medical ages. These are
 * people who later detransitioned or desisted, so nothing here describes
 * people who stayed in transition.
 */
export default function EarlyTransitionSection() {
  const t = useTranslations("statsPage.minors");
  const format = useFormatter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<MinorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = buildFeatureParams(searchParams);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/features/minors?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as MinorResponse;
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
  }, [params]);

  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("error")}: {error}
      </p>
    );
  }

  if (loading && !data) {
    return <ChartSkeleton height="h-80" />;
  }

  if (!data || data.coverage.withAge === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="space-y-8">
      <ChartBlock>
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-3xl font-semibold tabular-nums">
                {data.tiles.minorShare}%
              </p>
              <p className="text-muted-foreground mt-1 text-base">
                {t("tiles.minor", {
                  n: format.number(data.coverage.withAge),
                  total: format.number(data.coverage.total),
                })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-3xl font-semibold tabular-nums">
                {data.tiles.le15Share}%
              </p>
              <p className="text-muted-foreground mt-1 text-base">
                {t("tiles.le15")}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-3xl font-semibold tabular-nums">
                {data.tiles.dysphoriaShare}%
              </p>
              <p className="text-muted-foreground mt-1 text-base">
                {t("tiles.dysphoria", {
                  n: format.number(data.tiles.dysphoriaN),
                })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-3xl font-semibold tabular-nums">
                {data.tiles.femaleMinorShare}%
              </p>
              <p className="text-muted-foreground mt-1 text-base">
                {t("tiles.female")}
              </p>
            </div>
          </div>

          {data.tiles.blockers.n > 0 && (
            <p className="text-base">
              {t("early", {
                min: data.tiles.blockers.min ?? "—",
                median: data.tiles.blockers.median?.toFixed(0) ?? "—",
                n: format.number(data.tiles.blockers.n),
                hormones: format.number(data.tiles.hormonesLe16),
                detrans: format.number(data.tiles.detransitionLe18),
              })}
            </p>
          )}
        </div>
      </ChartBlock>

      {data.byEra?.some((era) => era.n > 0) && (
        <ChartBlock
          title={t("byEra.title")}
          description={t("byEra.description")}
        >
          <PrevalenceRows
            sort={false}
            note={t("byEra.note")}
            items={data.byEra
              .filter((era) => era.n > 0)
              .map((era) => ({
                key: era.key,
                label: formatYearBucket(era),
                n: era.n,
                above: era.minors,
                stories: false,
              }))}
          />
        </ChartBlock>
      )}
    </div>
  );
}
