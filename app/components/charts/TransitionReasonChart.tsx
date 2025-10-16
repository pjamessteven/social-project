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
}: TransitionReasonChartProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<TransitionReasonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      console.log("Fetching transition reasons with params:", params.toString());

      const response = await fetch(
        `/api/users/transition-reasons?${params.toString()}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch transition reasons data: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("Transition reasons API response:", result);
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid data format received from API");
      }

      // Filter out reasons with 0 users for cleaner visualization
      const filteredData = result.data.filter((item: TransitionReasonData) => item.userCount > 0);
      console.log("Filtered transition reasons data:", filteredData);
      
      setData(filteredData);
      setError(null);
    } catch (err) {
      console.error("Error fetching transition reasons:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [minAge, maxAge, searchParams]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded border border-gray-300 bg-white p-3 shadow-lg">
          <p className="font-medium text-black">{data.name}</p>
          <p className="text-sm text-gray-600">
            {`${data.userCount} users (${((data.userCount / payload[0].payload.total) * 100).toFixed(1)}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
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
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Calculate total for percentage calculations
  const totalUsers = data.reduce((sum, item) => sum + item.userCount, 0);
  const dataWithTotal = data.map(item => ({ ...item, total: totalUsers }));

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
        <div className="text-red-500 mb-2">Error: {error}</div>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No transition reason data available for the selected filters
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <h3 className="font-semibold">
          What were the main reasons for transitioning?
        </h3>
        <p className="text-sm text-gray-600">
          Data from Reddit user transition timelines ({totalUsers} users)
        </p>
      </div>
      <div className={`w-full ${className}`}>
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value, entry) => (
                <span style={{ color: entry.color }}>
                  {value} ({entry.payload.userCount})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
