"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface AgeData {
  age: number;
  transition: number;
  detransition: number;
}

interface AgeDistributionChartProps {
  className?: string;
  minAge: number;
  maxAge: number;
}

export default function AgeDistributionChart({
  className,
  minAge,
  maxAge,
}: AgeDistributionChartProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AgeData[]>([]);
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
        `/api/users/age-distribution?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch age distribution data");
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded border border-gray-300 bg-white p-3 shadow-lg">
          <p className="font-medium">{`Age: ${label}`}</p>
          <p className="text-blue-600">
            {`Transitioned: ${payload[0]?.value || 0} users`}
          </p>
          <p className="text-red-600">
            {`Detransitioned: ${Math.abs(payload[1]?.value || 0)} users`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Age Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Transition {" -> "} Detransition Ages</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 0,
                left: -20,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="age"
                label={{ value: "Age", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                label={{
                  value: "Number of Users",
                  angle: -90,
                  position: "insideMiddle",
                  style: { marginRight: "200px" },
                }}
                tickFormatter={(value) => Math.abs(value).toString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="left"
                height={36}
                wrapperStyle={{ paddingTop: "28px", paddingLeft: "56px" }}
              />
              <Bar
                dataKey="transition"
                fill="#3b82f6"
                name="Transition Age"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="detransition"
                fill="#ef4444"
                name="Detransition Age"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {!loading && data.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No data available for the selected age range
          </div>
        )}
      </CardContent>
    </Card>
  );
}
