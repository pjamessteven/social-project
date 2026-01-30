"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("charts.ageDistribution");
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
        throw new Error(t("fetchError"));
      }

      const result = await response.json();
      // Transform data to ensure both datasets are positive
      const transformedData = result.data.map((item: AgeData) => ({
        ...item,
        detransition: Math.abs(item.detransition),
      }));
      setData(transformedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
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
          <p className="font-medium text-black">
            {t("tooltip.age", { age: label })}
          </p>
          <p className="font-medium text-blue-600">
            {t("tooltip.transitioned", { count: payload[0]?.value || 0 })}
          </p>
          <p className="font-medium text-red-600">
            {t("tooltip.detransitioned", { count: payload[1]?.value || 0 })}
          </p>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="py-8 text-center text-red-500">
        {t("errorPrefix")} {error}
      </div>
    );
  }

  return (
    <>
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="text-gray-500">{t("loading")}</div>
        </div>
      ) : (
        <>
          <div className="p-4">
            <h3 className="font-semibold">{t("title")}</h3>
            <p className="text-sm text-gray-600">{t("subtitle")}</p>
          </div>
          <div className={`w-full ${className}`}>
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
                  dataKey="age"
                  label={{
                    value: t("axis.age"),
                    position: "bottom",
                    offset: 5,
                  }}
                />
                <YAxis
                  label={{
                    value: t("axis.users"),
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
                  name={t("legend.transition")}
                />
                <Area
                  type="monotone"
                  dataKey="detransition"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorDetransition)"
                  name={t("legend.detransition")}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!loading && data.length === 0 && (
        <div className="py-8 text-center text-gray-500">{t("noData")}</div>
      )}
    </>
  );
}
