"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import { useState } from "react";
import AgeDistributionChart from "./AgeDistributionChart";

import TransitionPathwaysChart from "./TransitionPathwaysChart";

import ReasonChart from "./ReasonChart";
import TransitionDurationChart from "./TransitionDurationChart";

interface StoriesChartsProps {
  resolvedSearchParams: {
    minAge?: string;
    maxAge?: string;
  };
}

export default function StoriesCharts({
  resolvedSearchParams,
}: StoriesChartsProps) {
  const [activeTab, setActiveTab] = useState<
    | "age"
    | "duration"
    | "transitionReasons"
    | "detransitionReasons"
    | "pathways"
  >("age");

  return (
    <Card className="mb-8 overflow-hidden">
      <div className="bg-secondary flex flex-row justify-start overflow-x-auto dark:bg-black">
        <div
          className={`hover:text-foreground cursor-pointer border-r p-4 text-sm sm:px-6 ${
            activeTab === "age"
              ? "dark:bg-secondary bg-white font-medium"
              : "text-muted-foreground font-medium"
          }`}
          onClick={() => setActiveTab("age")}
        >
          <div className="whitespace-nowrap">Age</div>
        </div>
        <div
          className={`hover:text-foreground cursor-pointer border-r p-4 text-sm sm:px-6 ${
            activeTab === "duration"
              ? "dark:bg-secondary bg-white font-medium"
              : "text-muted-foreground font-medium"
          }`}
          onClick={() => setActiveTab("duration")}
        >
          <div className="whitespace-nowrap">Duration</div>
        </div>
        <div
          className={`hover:text-foreground cursor-pointer border-r p-4 text-sm sm:px-6 ${
            activeTab === "transitionReasons"
              ? "dark:bg-secondary bg-white font-medium"
              : "text-muted-foreground font-medium"
          }`}
          onClick={() => setActiveTab("transitionReasons")}
        >
          <div className="whitespace-nowrap">Transition Reason</div>
        </div>
        <div
          className={`hover:text-foreground cursor-pointer border-r p-4 text-sm sm:px-6 ${
            activeTab === "detransitionReasons"
              ? "dark:bg-secondary bg-white font-medium"
              : "text-muted-foreground font-medium"
          }`}
          onClick={() => setActiveTab("detransitionReasons")}
        >
          <div className="whitespace-nowrap">Detransition Reason</div>
        </div>
        <div
          className={`hover:text-foreground cursor-pointer p-4 text-sm sm:px-6 ${
            activeTab === "pathways"
              ? "dark:bg-secondary bg-white font-medium"
              : "text-muted-foreground font-medium"
          }`}
          onClick={() => setActiveTab("pathways")}
        >
          <div className="whitespace-nowrap">Pathway</div>
        </div>
      </div>
      <CardContent className="overflow-x-auto overflow-y-hidden p-0">
        {activeTab === "age" && (
          <AgeDistributionChart
            className="min-w-xl shadow-lg"
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

        {activeTab === "duration" && (
          <TransitionDurationChart
            className="min-w-xl shadow-lg"
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

        {activeTab === "transitionReasons" && (
          <ReasonChart
            mode="transition"
            className="min-w-xl shadow-lg"
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
        {activeTab === "detransitionReasons" && (
          <ReasonChart
            mode="detransition"
            className="min-w-xl shadow-lg"
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
            className="min-w-xl shadow-lg"
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
