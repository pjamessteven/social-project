"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface YearData {
  year: number;
  transition: number;
  detransition: number;
}

interface YearDistributionChartProps {
  className?: string;
  minAge: number;
  maxAge: number;
}

export default function YearDistributionChart({
  className,
  minAge,
  maxAge,
}: YearDistributionChartProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<YearData[]>([]);
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
        `/api/users/year-distribution?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch year distribution data");
      }

      const result = await response.json();
      // Transform data to ensure both datasets are positive
      const transformedData = result.data.map((item: YearData) => ({
        ...item,
        detransition: Math.abs(item.detransition),
      }));
      setData(transformedData);
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded border border-gray-300 bg-white p-3 shadow-lg">
          <p className="font-medium text-black">{`Year: ${label}`}</p>
          <p className="font-medium text-blue-600">
            {`Transitioned: ${payload[0]?.value || 0} users`}
          </p>
          <p className="font-medium text-red-600">
            {`Detransitioned: ${payload[1]?.value || 0} users`}
          </p>
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
            <h3 className="text-lg font-semibold">
              Transition & Detransition trends by year{" "}
            </h3>
            <p className="text-sm text-gray-600">
              Please note that a lot of users are currently missing year data
            </p>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={data}
              margin={{
                top: 32,
                right: 32,
                left: 32,
                bottom: 32,
              }}
            >
              <defs>
                <linearGradient
                  id="colorTransition"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorDetransition"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="year"
                label={{ value: "Year", position: "bottom", offset: 5 }}
              />
              <YAxis
                label={{
                  value: "Number of Users",
                  angle: -90,
                  position: "left",
                  offset: 5,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="left"
                height={36}
                wrapperStyle={{ paddingTop: "28px" }}
              />
              <Area
                type="monotone"
                dataKey="transition"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTransition)"
                name="Transition Age"
              />
              <Area
                type="monotone"
                dataKey="detransition"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorDetransition)"
                name="Detransition Age"
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}

      {!loading && data.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No data available for the selected year range
        </div>
      )}
    </>
  );
}
