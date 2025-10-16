"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TransitionReasonData {
  id: number;
  name: string;
  userCount: number;
}

interface TransitionReasonChartProps {
  className?: string;
  minAge?: number;
  maxAge?: number;
  mode: "detransition" | "transition";
}

// Color palette for pie chart segments
const COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // yellow
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#6b7280", // gray
];

export default function TransitionReasonChart({
  className,
  minAge,
  maxAge,
  mode,
}: TransitionReasonChartProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<TransitionReasonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(0);
  const [totalReasonCount, setTotalReasonCount] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build params from current search params and props
      const params = new URLSearchParams();

      if (minAge !== undefined) {
        params.set("minAge", minAge.toString());
      }
      if (maxAge !== undefined) {
        params.set("maxAge", maxAge.toString());
      }

      // Include sex filter if present
      const sex = searchParams.get("sex");
      if (sex) {
        params.set("sex", sex);
      }

      // set mode 'transition reason' or 'detransition reason'
      params.set("mode", mode);

      console.log(
        `Fetching ${mode} reasons with params:`,
        params.toString(),
      );

      const apiRoute = "/api/users/reasons" 

      const response = await fetch(
        `${apiRoute}?${params.toString()}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch ${mode} reasons data: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();
      console.log(`${mode} reasons API response:`, result);

      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid data format received from API");
      }

      setTotalUsers(result.total);

      // Convert userCount to numbers and filter out reasons with 0 users for cleaner visualization
      const processedData = result.data
        .map((item: any) => ({
          ...item,
          userCount: parseInt(item.userCount, 10),
        }))
        .filter((item: TransitionReasonData) => item.userCount > 0);
      console.log(`Filtered ${mode} reasons data:`, processedData);

      // Calculate total reason count (sum of all individual reason counts)
      const totalCount = processedData.reduce((sum: any, item: { userCount: any; }) => sum + item.userCount, 0);
      setTotalReasonCount(totalCount);

      setData(processedData);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${mode} reasons:`, err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [minAge, maxAge, searchParams, mode]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded border border-gray-300 bg-white p-3 shadow-lg">
          <p className="font-medium text-black">{data.name}</p>
          <p className="text-sm text-gray-600">
            {`${data.userCount} mentions (${((data.userCount / payload[0].payload.totalReasonCount) * 100).toFixed(1)}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    // Only show label if percentage is above 5% to avoid clutter
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Calculate total for percentage calculations and limit legend entries
  const dataWithTotal = data.map((item) => ({ ...item, total: totalUsers, totalReasonCount }));
  const legendData = dataWithTotal.slice(0, 14);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <div className="mb-2 text-red-500">Error: {error}</div>
        <button
          onClick={fetchData}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No {mode} reason data available for the selected filters
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <h3 className="font-semibold">
          Why do detransitioners say they {mode === "detransition" ? "de-transitioned" : "transitioned"}?
        </h3>
        <p className="text-sm text-gray-600">
          Data from Reddit user {mode} timelines ({totalReasonCount} total users, {totalUsers} distinct reasons.)
        </p>
      </div>
      <div className={`w-full ${className}`}>
        <ResponsiveContainer width="100%" height={500}>
          <PieChart
            margin={{
              bottom: 96,
              right: 8,
              left: 8,
            }}
          >
            <Pie
              data={dataWithTotal}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={150}
              fill="#8884d8"
              dataKey="userCount"
            >
              {dataWithTotal.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={68}
              payload={legendData}
              wrapperStyle={{ marginTop: "-20px" }}
              formatter={(value, entry) => {
                const index = dataWithTotal.findIndex(item => item.name === value);
                if (index >= 0) return null;
                const userCount = index >= 0 ? dataWithTotal[index].userCount : 0;
                return (
                  <span style={{ color: entry.color }}>
                    {value} ({userCount})
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
