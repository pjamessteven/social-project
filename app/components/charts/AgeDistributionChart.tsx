"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Slider } from "../ui/slider";

interface AgeData {
  age: number;
  transition: number;
  detransition: number;
}

interface AgeDistributionChartProps {
  className?: string;
}

export default function AgeDistributionChart({ className }: AgeDistributionChartProps) {
  const [data, setData] = useState<AgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageRange, setAgeRange] = useState([10, 40]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (minAge: number, maxAge: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/users/age-distribution?minAge=${minAge}&maxAge=${maxAge}`
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
    fetchData(ageRange[0], ageRange[1]);
  }, [ageRange]);

  const handleAgeRangeChange = (newRange: number[]) => {
    setAgeRange(newRange);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium">{`Age: ${label}`}</p>
          <p className="text-blue-600">
            {`Transition: ${payload[0]?.value || 0} users`}
          </p>
          <p className="text-red-600">
            {`Detransition: ${Math.abs(payload[1]?.value || 0)} users`}
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
        <CardTitle>Transition vs Detransition Age Distribution</CardTitle>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Age Range: {ageRange[0]} - {ageRange[1]} years
            </label>
            <Slider
              value={ageRange}
              onValueChange={handleAgeRangeChange}
              min={5}
              max={60}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="age" 
                label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Number of Users', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => Math.abs(value).toString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
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
          <div className="text-center py-8 text-gray-500">
            No data available for the selected age range
          </div>
        )}
      </CardContent>
    </Card>
  );
}
