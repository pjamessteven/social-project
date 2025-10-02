"use client";

import { List, Star, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { DataQuestionCategories } from "./DataQuestionCategories";
import { QuestionCategoriesClient } from "./QuestionCategoriesClient";

interface QuestionTabsProps {
  mode: "affirm" | "detrans" | "compare";
}

export function QuestionTabs({ mode }: QuestionTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<"featured" | "all" | "top">(
    "featured",
  );

  // Sync state with URL params on mount
  useEffect(() => {
    const newTab = searchParams?.get("all") !== null ? "all" : "featured";
    setCurrentTab(newTab);
  }, [searchParams]);

  const handleTabChange = (tab: "featured" | "all" | "top") => {
    setCurrentTab(tab);
    if (tab === "all") {
      router.replace("/?all", { scroll: false });
    } else {
      router.replace("/", { scroll: false });
    }
  };

  return (
    <>
      <div
        id="question-tabs"
        className="mb-6 grid max-w-[660px] grid-cols-2 gap-3 border-t border-b py-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Button
          variant={currentTab === "featured" ? "default" : "secondary"}
          className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("featured")}
        >
          <Star className="h-4 w-4" />
          <span className="text-sm font-medium">Featured Questions</span>
        </Button>
        <Button
          variant={currentTab === "all" ? "default" : "secondary"}
          className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("top")}
        >
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Top Questions</span>
        </Button>
        <Button
          variant={currentTab === "all" ? "default" : "secondary"}
          className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("all")}
        >
          <List className="h-4 w-4" />
          <span className="text-sm font-medium">All Questions</span>
        </Button>
      </div>
      {currentTab === "featured" ? (
        <QuestionCategoriesClient mode={mode} />
      ) : (
        <DataQuestionCategories mode={mode} />
      )}
    </>
  );
}
