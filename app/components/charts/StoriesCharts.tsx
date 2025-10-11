"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import AgeDistributionChart from "./AgeDistributionChart";
import YearDistributionChart from "./YearDistributionChart";

interface StoriesChartsProps {
  resolvedSearchParams: {
    minAge?: string;
    maxAge?: string;
  };
}

export default function StoriesCharts({ resolvedSearchParams }: StoriesChartsProps) {
  const [activeTab, setActiveTab] = useState<"age" | "year">("age");

  return (

    <Card className="mb-8 overflow-hidden">
      <div className="flex flex-row justify-start bg-gray-100">
        <div 
          className={`cursor-pointer p-6 ${
            activeTab === "age" ? "bg-white" : ""
          }`}
          onClick={() => setActiveTab("age")}
        >
          <div className="font-semibold">
            Age Distribution
          </div>
        </div>
        <div 
          className={`cursor-pointer p-6 ${
            activeTab === "year" ? "bg-white" : ""
          }`}
          onClick={() => setActiveTab("year")}
        >
          <div className="font-semibold">
            Year Distribution
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        {activeTab === "age" && (
          <AgeDistributionChart
            className="shadow-lg"
            minAge={
              typeof resolvedSearchParams.minAge === "string"
                ? parseInt(resolvedSearchParams.minAge)
                : 10
            }
            maxAge={
              typeof resolvedSearchParams.maxAge === "string"
                ? parseInt(resolvedSearchParams.maxAge)
                : 40
            }
          />
        )}
        {activeTab === "year" && (
          <YearDistributionChart
            className="shadow-lg"
            minAge={
              typeof resolvedSearchParams.minAge === "string"
                ? parseInt(resolvedSearchParams.minAge)
                : 10
            }
            maxAge={
              typeof resolvedSearchParams.maxAge === "string"
                ? parseInt(resolvedSearchParams.maxAge)
                : 40
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
