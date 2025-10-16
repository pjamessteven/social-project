"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import { useState } from "react";
import AgeDistributionChart from "./AgeDistributionChart";
import YearDistributionChart from "./YearDistributionChart";
import TransitionPathwaysChart from "./TransitionPathwaysChart";
import TransitionReasonChart from "./TransitionReasonChart";

interface StoriesChartsProps {
  resolvedSearchParams: {
    minAge?: string;
    maxAge?: string;
  };
}

export default function StoriesCharts({
  resolvedSearchParams,
}: StoriesChartsProps) {
  const [activeTab, setActiveTab] = useState<"age" | "reasons" | "pathways">(
    "age",
  );

  return (
    <Card className="mb-8 overflow-hidden">
      <div className="bg-secondary flex flex-row justify-start dark:bg-black overflow-x-auto">
        <div
          className={`hover:text-foreground cursor-pointer p-4 sm:px-6  text-sm sm:text-base ${
            activeTab === "age"
              ? "dark:bg-secondary bg-white font-medium"
              : "text-muted-foreground font-medium"
          }`}
          onClick={() => setActiveTab("age")}
        >
          <div className="">Age Distribution</div>
        </div>


        <div
          className={`hover:text-foreground cursor-pointer p-4 sm:px-6  text-sm sm:text-base ${
            activeTab === "reasons"
              ? "dark:bg-secondary bg-white"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("reasons")}
        >
          <div className="font-semibold">Transition Reasons</div>
        </div>

        <div
          className={`hover:text-foreground cursor-pointer  p-4 sm:px-6 text-sm sm:text-base ${
            activeTab === "pathways"
              ? "dark:bg-secondary bg-white font-medium"
              : "text-muted-foreground font-medium"
          }`}
          onClick={() => setActiveTab("pathways")}
        >
          <div >Detransition Pathways</div>
        </div>
      </div>
      <CardContent className="p-0 overflow-x-auto">
        {activeTab === "age" && (
          <AgeDistributionChart
            className="shadow-lg min-w-xl"
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

        {activeTab === "reasons" && (
          <TransitionReasonChart
            className="shadow-lg min-w-lg"
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

        {activeTab === "pathways" && (
          <TransitionPathwaysChart
            className="shadow-lg min-w-xl"
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
