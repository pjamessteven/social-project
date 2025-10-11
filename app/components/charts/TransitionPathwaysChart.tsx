"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SankeyFlow } from "@/app/lib/availableTags";

interface SankeyNode {
  id: string;
  label: string;
  stage: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface TransitionPathwaysChartProps {
  className?: string;
  minAge: number;
  maxAge: number;
}

export default function TransitionPathwaysChart({
  className,
  minAge,
  maxAge,
}: TransitionPathwaysChartProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SankeyData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (minAge: number, maxAge: number) => {
    try {
      setLoading(true);

      // Build params from current search params
      const params = new URLSearchParams();
      params.set("minAge", minAge.toString());
      params.set("maxAge", maxAge.toString());

      // Include sex filter if present
      const sex = searchParams.get("sex");
      if (sex) {
        params.set("sex", sex);
      }

      // Include tag filter if present
      const tag = searchParams.get("tag");
      if (tag) {
        params.set("tag", tag);
      }

      const response = await fetch(
        `/api/users/tag-distribution?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tag distribution data");
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(minAge, maxAge);
  }, [minAge, maxAge, searchParams]);

  // Group nodes by stage for rendering
  const nodesByStage = data.nodes.reduce((acc, node) => {
    if (!acc[node.stage]) acc[node.stage] = [];
    acc[node.stage].push(node);
    return acc;
  }, {} as Record<number, SankeyNode[]>);

  // Calculate node positions and sizes based on flow values
  const getNodeSize = (nodeId: string) => {
    const incomingFlow = data.links
      .filter(link => link.target === nodeId)
      .reduce((sum, link) => sum + link.value, 0);
    const outgoingFlow = data.links
      .filter(link => link.source === nodeId)
      .reduce((sum, link) => sum + link.value, 0);
    return Math.max(incomingFlow, outgoingFlow, 1);
  };

  if (error) {
    return <div className="py-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <>
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="text-gray-500">Loading pathway data...</div>
        </div>
      ) : (
        <div className={`w-full ${className}`}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Transition Pathways Flow</h3>
            <p className="text-sm text-gray-600">
              Flow from demographics through transition outcomes
            </p>
          </div>
          
          <div className="relative h-96 overflow-x-auto border rounded-lg bg-gray-50 p-4">
            <div className="flex h-full min-w-max items-center justify-between space-x-8">
              {SankeyFlow.map((stage, stageIndex) => (
                <div key={stage.stage} className="flex flex-col items-center space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {stage.label}
                  </h4>
                  <div className="flex flex-col space-y-1">
                    {nodesByStage[stageIndex]?.map((node) => {
                      const size = getNodeSize(node.id);
                      const height = Math.max(20, Math.min(80, size * 2));
                      return (
                        <div
                          key={node.id}
                          className="flex items-center justify-center rounded bg-blue-500 text-white text-xs px-2 py-1 min-w-20"
                          style={{ height: `${height}px` }}
                          title={`${node.label}: ${size} users`}
                        >
                          <div className="text-center">
                            <div className="font-medium">{node.label}</div>
                            <div className="text-xs opacity-80">{size}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Total users:</strong> {data.nodes.length > 0 ? 
                Math.max(...data.nodes.map(node => getNodeSize(node.id))) : 0}
            </p>
            <p>
              <strong>Flow connections:</strong> {data.links.length}
            </p>
          </div>
        </div>
      )}

      {!loading && data.nodes.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No pathway data available for the selected filters
        </div>
      )}
    </>
  );
}
