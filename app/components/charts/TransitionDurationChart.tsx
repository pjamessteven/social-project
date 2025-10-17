"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface TransitionDurationData {
  transitionAge: number;
  detransitionAge: number;
  duration: number;
  sex: string;
  count: number;
}

interface TransitionDurationChartProps {
  className?: string;
  minAge: number;
  maxAge: number;
}

export default function TransitionDurationChart({
  className,
  minAge,
  maxAge,
}: TransitionDurationChartProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<TransitionDurationData[]>([]);
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
        `/api/users/transition-duration?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transition duration data");
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(minAge, maxAge);
  }, [minAge, maxAge, searchParams]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded border border-gray-300 bg-white p-3 shadow-lg">
          <p className="font-medium text-black">{`Transition Age: ${data.transitionAge}`}</p>
          <p className="font-medium text-black">{`Detransition Age: ${data.detransitionAge}`}</p>
          <p className="font-medium text-blue-600">{`Duration: ${data.duration} years`}</p>
          <p className="text-sm text-gray-600">{`${data.count} user${data.count !== 1 ? 's' : ''}`}</p>
        </div>
      );
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
          <div className="text-gray-500">Loading chart data...</div>
        </div>
      ) : (
        <>
          <div className="p-4">
            <h3 className="font-semibold">
              Transition Duration: Age at Transition vs Age at Detransition
            </h3>
            <p className="text-sm text-gray-600">
              Each point shows transition age (X) vs detransition age (Y). <br className="hidden sm:inline"/>
              <span className="text-blue-600">Blue = Male</span>, <span className="text-red-500">Red = Female</span>. <br className="hidden sm:inline"/>
              Larger, more opaque points represent more users.
            </p>
          </div>
          <div className={`w-full ${className}`}>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart
                data={data}
                margin={{
                  top: 32,
                  right: 32,
                  left: 32,
                  bottom: 32,
                }}
              >
                <XAxis
                  type="number"
                  dataKey="transitionAge"
                  domain={[minAge, maxAge]}
                  label={{ value: "Age at Transition", position: "bottom", offset: 5 }}
                />
                <YAxis
                  type="number"
                  domain={[minAge, maxAge]}
                  label={{
                    value: "Age at Detransition",
                    angle: -90,
                    position: "left",
                    offset: 5,
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Reference line showing where transition age = detransition age */}
                <ReferenceLine
                  segment={[
                    { x: minAge, y: minAge },
                    { x: maxAge, y: maxAge }
                  ]}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                />
                
                <Scatter
                  dataKey="detransitionAge"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload || !cx || !cy) {
                      return <circle cx={0} cy={0} r={0} fill="transparent" />;
                    }
                    
                    // Calculate size based on count (min 3, max 15)
                    const maxCount = Math.max(...data.map(d => d.count));
                    const minSize = 3;
                    const maxSize = 15;
                    const size = minSize + (payload.count / maxCount) * (maxSize - minSize);
                    
                    // Calculate opacity based on count (min 0.3, max 0.8)
                    const minOpacity = 0.3;
                    const maxOpacity = 0.8;
                    const opacity = minOpacity + (payload.count / maxCount) * (maxOpacity - minOpacity);
                    
                    // Choose color based on sex
                    const isMale = payload.sex === 'M';
                    const fillColor = isMale ? "#3b82f6" : "#ef4444";
                    const strokeColor = isMale ? "#1d4ed8" : "#dc2626";
                    
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={size}
                        fill={fillColor}
                        fillOpacity={opacity}
                        stroke={strokeColor}
                        strokeWidth={1}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!loading && data.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No data available for the selected age range
        </div>
      )}
    </>
  );
}
