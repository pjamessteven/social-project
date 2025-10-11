"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SankeyFlow } from "@/app/lib/availableTags";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

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

interface RechartsNode {
  name: string;
}

interface RechartsLink {
  source: number;
  target: number;
  value: number;
}

interface RechartsData {
  nodes: RechartsNode[];
  links: RechartsLink[];
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

  // Transform data for Recharts format
  const transformDataForRecharts = (sankeyData: SankeyData): RechartsData => {
    // Create a mapping from node IDs to indices
    const nodeIdToIndex = new Map<string, number>();
    sankeyData.nodes.forEach((node, index) => {
      nodeIdToIndex.set(node.id, index);
    });

    // Transform nodes to Recharts format
    const rechartsNodes: RechartsNode[] = sankeyData.nodes.map(node => ({
      name: node.label
    }));

    // Transform links to use indices instead of IDs
    const rechartsLinks: RechartsLink[] = sankeyData.links.map(link => ({
      source: nodeIdToIndex.get(link.source) || 0,
      target: nodeIdToIndex.get(link.target) || 0,
      value: link.value
    }));

    return {
      nodes: rechartsNodes,
      links: rechartsLinks
    };
  };

  const rechartsData = transformDataForRecharts(data);

  // Calculate total users for display
  const totalUsers = data.nodes.length > 0 ? 
    Math.max(...data.links.map(link => link.value)) : 0;

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
          <div className="p-4">
            <h3 className="text-lg font-semibold">Transition Pathways Flow</h3>
            <p className="text-sm text-gray-600">
              Flow from demographics through transition outcomes
            </p>
          </div>
          
          <div className="h-96 w-full border rounded-lg ">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={rechartsData}
                nodePadding={20}
                nodeWidth={15}
                linkCurvature={0.5}
                iterations={32}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                node={{ 
                  fill: '#3b82f6',
                  stroke: '#1e40af',
                  strokeWidth: 1
                }}
                link={{ 
                  stroke: '#94a3b8',
                  strokeOpacity: 0.6
                }}
              >
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border rounded shadow-lg">
                          <p className="font-medium">{data.name || `${data.source?.name} → ${data.target?.name}`}</p>
                          {data.value && <p className="text-sm text-gray-600">Users: {data.value}</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </Sankey>
            </ResponsiveContainer>
          </div>

          <div className="p-4 text-sm text-gray-600">
            <p>
              <strong>Total users:</strong> {totalUsers}
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
