"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface YearData {
  year: number;
  transition: number;
  detransition: number;
}

interface YearDistributionChartProps {
  className?: string;
  minYear: number;
  maxYear: number;
}

export default function YearDistributionChart({ className, minYear, maxYear }: YearDistributionChartProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<YearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (minYear: number, maxYear: number) => {
    try {
      setLoading(true);
      
      // Build params from current search params
      const params = new URLSearchParams();
      params.set('minYear', minYear.toString());
      params.set('maxYear', maxYear.toString());
      
      // Include sex filter if present
      const sex = searchParams.get('sex');
      if (sex) {
        params.set('sex', sex);
      }
      
      // Include tag filter if present
      const tag = searchParams.get('tag');
      if (tag) {
        params.set('tag', tag);
      }
      
      const response = await fetch(
        `/api/users/year-distribution?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch year distribution data");
      }
      
      const result = await response.json();
      // Transform data to ensure both datasets are positive
      const transformedData = result.data.map((item: YearData) => ({
        ...item,
        detransition: Math.abs(item.detransition)
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
    fetchData(minYear, maxYear);
  }, [minYear, maxYear, searchParams]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium text-black">{`Year: ${label}`}</p>
          <p className="font-medium  text-blue-600">
            {`Transitioned: ${payload[0]?.value || 0} users`}
          </p>
          <p className="font-medium  text-red-600">
            {`Detransitioned: ${payload[1]?.value || 0} users`}
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
          <CardTitle>Year Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-8">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Transition & Detransition Year Distribution</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={data}
              margin={{
                top: 20,
                right: 0,
                left: 28,
                bottom: 28,
              }}
            >
              <defs>
                <linearGradient id="colorTransition" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDetransition" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="year" 
                label={{ value: 'Year', position: 'bottom', offset:5 }}
              />
              <YAxis 
                label={{ 
                  value: 'Number of Users', 
                  angle: -90, 
                  position: 'left',
                  offset: 5
                }}

              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" align="left" height={36} wrapperStyle={{ paddingTop: '28px' }} />
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
        )}
        
        {!loading && data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No data available for the selected year range
          </div>
        )}
      </CardContent>
    </Card>
  );
}
