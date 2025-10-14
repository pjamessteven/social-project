"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  sex?: string;
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
  sex?: string;
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
    // Filter out nodes that have no connections
    const connectedNodeIds = new Set<string>();
    sankeyData.links.forEach((link) => {
      connectedNodeIds.add(link.source);
      connectedNodeIds.add(link.target);
    });

    const connectedNodes = sankeyData.nodes.filter((node) =>
      connectedNodeIds.has(node.id),
    );

    // Create a mapping from node IDs to indices
    const nodeIdToIndex = new Map<string, number>();
    connectedNodes.forEach((node, index) => {
      nodeIdToIndex.set(node.id, index);
    });

    // Transform nodes to Recharts format with better labels
    const rechartsNodes: RechartsNode[] = connectedNodes.map((node) => ({
      name:
        node.label ||
        node.id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    }));

    // Transform links to use indices instead of IDs, filter out invalid links
    const rechartsLinks: RechartsLink[] = sankeyData.links
      .filter(
        (link) =>
          nodeIdToIndex.has(link.source) && nodeIdToIndex.has(link.target),
      )
      .map((link) => ({
        source: nodeIdToIndex.get(link.source)!,
        target: nodeIdToIndex.get(link.target)!,
        value: link.value,
        sex: link.sex,
      }));

    return {
      nodes: rechartsNodes,
      links: rechartsLinks,
    };
  };

  const rechartsData = transformDataForRecharts(data);

  // Calculate total users for display (sum of first stage outgoing links)
  const totalUsers = data.links
    .filter((link) => link.source.startsWith("sex_"))
    .reduce((sum, link) => sum + link.value, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;

      // Handle link tooltips (pathways between nodes)
      if (
        data.source !== undefined &&
        data.target !== undefined &&
        data.value
      ) {
        const sourceNode = rechartsData.nodes[data.source];
        const targetNode = rechartsData.nodes[data.target];
        const sexLabel = data.sex ? ` (${data.sex})` : '';
        return (
          <div className="rounded border border-gray-300 bg-white p-3 shadow-lg">
            <p className="font-medium text-black">
              {sourceNode?.name} → {targetNode?.name}{sexLabel}
            </p>
            <p className="font-medium text-blue-600">{data.value} users</p>
            <p className="text-sm text-gray-600">
              {((data.value / totalUsers) * 100).toFixed(1)}% of total
            </p>
          </div>
        );
      }

      // Handle node tooltips
      if (data.name) {
        // Calculate total users flowing through this node
        const nodeIndex = rechartsData.nodes.findIndex(
          (n) => n.name === data.name,
        );
        const incomingFlow = rechartsData.links
          .filter((link) => link.target === nodeIndex)
          .reduce((sum, link) => sum + link.value, 0);
        const outgoingFlow = rechartsData.links
          .filter((link) => link.source === nodeIndex)
          .reduce((sum, link) => sum + link.value, 0);

        const nodeFlow = Math.max(incomingFlow, outgoingFlow);

        return (
          <div className="rounded border border-gray-300 bg-white p-3 shadow-lg">
            <p className="font-medium text-black">{data.name}</p>
            {nodeFlow > 0 && (
              <>
                <p className="font-medium text-blue-600">{nodeFlow} users</p>
                <p className="text-sm text-gray-600">
                  {((nodeFlow / totalUsers) * 100).toFixed(1)}% of total
                </p>
              </>
            )}
          </div>
        );
      }
    }
    return null;
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
        <>
          <div className="p-4">
            <h3 className="font-semibold">
              Detransition Pathways Flow
            </h3>
            <p className="text-sm text-gray-600">
              Flow of /r/detrans Reddit user demographics through to
              detransition outcomes
            </p>
          </div>
          <div className={`w-full ${className}`}>
            <div className="h-96 w-full rounded-lg border">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  width={960}
                  height={500}
                  data={rechartsData}
                  nodePadding={30}
                  nodeWidth={20}
                  linkCurvature={0.5}
                  iterations={32}
                  margin={{ top: 40, right: 96, bottom: 40, left: 32 }}
                  node={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    const labelText =
                      (payload?.name === "Unknown" && "Not Stated") ||
                      payload?.name ||
                      "Not Stated";

                    const percentage = (
                      (payload.value / totalUsers) *
                      100
                    ).toFixed(1);

                    return (
                      <g>
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill="#3b82f6"
                          stroke="#1e40af"
                          strokeWidth={1}
                        />

                        <text
                          x={x + width + 8}
                          y={y + height / 2 + 16}
                          textAnchor="start"
                          dominantBaseline="central"
                          fontSize={11}
                          fill="#b5b5b5ff"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          ({percentage}%)
                        </text>
                        <text
                          x={x + width + 8}
                          y={y + height / 2}
                          textAnchor="start"
                          dominantBaseline="central"
                          fontSize={11}
                          fill="white"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {labelText}
                        </text>

                      </g>
                    );
                  }}
                  link={(props: any) => {
                    const { sourceX, sourceY, targetX, targetY, sourceControlX, targetControlX, payload, sourceRelativeValue, targetRelativeValue } = props;
                    
                    // Color based on sex
                    let stroke = "#94a3b8"; // default gray
                    if (payload?.sex === "male") {
                      stroke = "#3b82f6"; // blue for male
                    } else if (payload?.sex === "female") {
                      stroke = "#ec4899"; // pink for female
                    }
                    
                    // Calculate stroke width based on the link's proportion of total flow
                    // This should match the visual thickness represented by node heights
                    const proportion = payload?.value / totalUsers;
                    const maxNodeHeight = 400; // Approximate max height available for nodes
                    const strokeWidth = Math.max(2, proportion * maxNodeHeight);

                    const path = `M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;
                    
                    return (
                      <path
                        d={path}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeOpacity={0.7}
                        fill="none"
                      />
                    );
                  }}
                >
                  <Tooltip content={<CustomTooltip />} />
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
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span>Male</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-pink-500"></div>
                  <span>Female</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                  <span>Unknown/Other</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && data.nodes.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No pathway data available for the selected filters
        </div>
      )}
    </>
  );
}
