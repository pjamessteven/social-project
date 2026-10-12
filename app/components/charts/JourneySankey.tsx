"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { useDarkMode } from "./useDarkMode";
import { buildFeatureParams, prettifyKey } from "./useFeatureData";

interface StageBucket {
  key: string;
  count: number;
}

interface FlowLink {
  cause?: string;
  process?: string;
  right: string;
  count: number;
}

interface JourneyResponse {
  cohort: number;
  stages: {
    cause: StageBucket[];
    process: StageBucket[];
    outcome: StageBucket[];
  };
  links: {
    causeProcess: FlowLink[];
    processOutcome: FlowLink[];
  };
}

const STAGE_INDEX = { cause: 0, process: 1, outcome: 2 } as const;
const STAGE_NAMESPACES = {
  cause: "causes",
  process: "processes",
  outcome: "outcomes",
} as const;
const STAGE_COLORS = ["#8b5cf6", "#3b82f6", "#10b981"] as const;

/**
 * Cause -> process -> outcome Sankey built entirely from Jev features.
 * Separate from the medical-pathway chart, which uses the legacy tags.
 */
export default function JourneySankey() {
  const t = useTranslations("statsPage.pathways");
  const searchParams = useSearchParams();
  const isDarkMode = useDarkMode();
  const [data, setData] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = buildFeatureParams(searchParams);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/features/pathways?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as JourneyResponse;
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

  const labelFor = (stage: keyof typeof STAGE_INDEX, key: string) => {
    const namespace = STAGE_NAMESPACES[stage];
    return t.has(`${namespace}.${key}`)
      ? t(`${namespace}.${key}`)
      : prettifyKey(key);
  };

  const { nodes, links } = useMemo(() => {
    if (!data) return { nodes: [] as any[], links: [] as any[] };
    const nodes: any[] = [];
    const index = new Map<string, number>();
    const addStage = (stage: keyof typeof STAGE_INDEX) => {
      for (const bucket of data.stages[stage]) {
        index.set(`${stage}:${bucket.key}`, nodes.length);
        nodes.push({
          name: labelFor(stage, bucket.key),
          stage: STAGE_INDEX[stage],
          value: bucket.count,
        });
      }
    };
    addStage("cause");
    addStage("process");
    addStage("outcome");

    const allLinks = [
      ...data.links.causeProcess.map((link) => ({
        fromKey: link.cause,
        toKey: link.right,
        fromStage: "cause" as const,
        toStage: "process" as const,
        value: link.count,
      })),
      ...data.links.processOutcome.map((link) => ({
        fromKey: link.process,
        toKey: link.right,
        fromStage: "process" as const,
        toStage: "outcome" as const,
        value: link.count,
      })),
    ]
      .map((link) => {
        const source = index.get(`${link.fromStage}:${link.fromKey}`);
        const target = index.get(`${link.toStage}:${link.toKey}`);
        if (source == null || target == null) return null;
        return {
          source,
          target,
          value: link.value,
          stage: STAGE_INDEX[link.fromStage],
          from: labelFor(link.fromStage, link.fromKey ?? ""),
          to: labelFor(link.toStage, link.toKey),
        };
      })
      .filter(Boolean);

    return { nodes, links: allLinks as any[] };
  }, [data, t]);

  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("error")}: {error}
      </p>
    );
  }

  if (loading && !data) {
    return <div className="bg-muted h-96 w-full animate-pulse rounded" />;
  }

  if (!data || nodes.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  const cohort = data.cohort;

  const renderNode = (props: any) => {
    const { x, y, width, height, payload } = props;
    const stage = (payload?.stage ?? 0) as 0 | 1 | 2;
    const percentage = cohort > 0 ? ((payload?.value ?? 0) / cohort) * 100 : 0;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={2}
          fill={isDarkMode ? "#334155" : "#e2e8f0"}
          stroke={STAGE_COLORS[stage]}
          strokeWidth={1.5}
        />
        <text
          x={x + width + 8}
          y={y + height / 2 - 6}
          fontSize={14}
          fill={isDarkMode ? "#f3f4f6" : "#374151"}
        >
          {payload?.name}
        </text>
        <text
          x={x + width + 8}
          y={y + height / 2 + 10}
          fontSize={13}
          fill={isDarkMode ? "#9ca3af" : "#6b7280"}
        >
          {percentage.toFixed(1)}%
        </text>
      </g>
    );
  };

  const renderLink = (props: any) => {
    const {
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourceControlX,
      targetControlX,
      payload,
    } = props;
    const color = STAGE_COLORS[(payload?.stage ?? 0) as 0 | 1 | 2];
    const width = Math.max(2, ((payload?.value ?? 1) / cohort) * 240);
    return (
      <path
        d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        stroke={color}
        strokeWidth={width}
        strokeOpacity={0.45}
        fill="none"
      />
    );
  };

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const link = payload[0]?.payload;
    if (!link?.from) return null;
    return (
      <div className="border-border bg-background rounded border p-2 text-sm shadow-lg">
        <p className="font-medium">
          {t("linkTooltip", {
            from: link.from,
            to: link.to,
            count: link.value,
          })}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {(["cause", "process", "outcome"] as const).map((stage) => (
          <span key={stage} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: STAGE_COLORS[STAGE_INDEX[stage]] }}
            />
            {t(`stages.${stage}`)}
          </span>
        ))}
      </div>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={{ nodes, links }}
            nodePadding={26}
            nodeWidth={16}
            linkCurvature={0.5}
            iterations={32}
            margin={{ top: 24, right: 170, bottom: 24, left: 16 }}
            node={renderNode}
            link={renderLink}
          >
            <Tooltip content={renderTooltip} />
          </Sankey>
        </ResponsiveContainer>
      </div>
      <p className="text-muted-foreground text-sm">
        {t("basedOn", { cohort })}
      </p>
    </div>
  );
}
