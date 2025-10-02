"use client";

import { HistoryIcon, List, Star, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { DataQuestionCategories } from "./DataQuestionCategories";
import { DynamicQuestionCategories } from "./DynamicQuestionCategories";
import { QuestionCategoriesClient } from "./QuestionCategoriesClient";

interface QuestionTabsProps {
  mode: "affirm" | "detrans" | "compare";
}

export function QuestionTabs({ mode }: QuestionTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<
    "featured" | "all" | "top" | "recent"
  >("featured");

  // Sync state with URL params on mount
  useEffect(() => {
    const questionsParam = searchParams?.get("questions");
    if (
      questionsParam === "all" ||
      questionsParam === "top" ||
      questionsParam === "recent" ||
      questionsParam === "featured"
    ) {
      setCurrentTab(questionsParam);
    } else {
      setCurrentTab("featured");
    }
  }, [searchParams]);

  const handleTabChange = (tab: "featured" | "all" | "top" | "recent") => {
    setCurrentTab(tab);
    if (tab === "featured") {
      router.replace("/", { scroll: false });
    } else {
      router.replace(`/?questions=${tab}`, { scroll: false });
    }
  };

  return (
    <>
      <div
        id="question-tabs"
        className="mb-8 grid max-w-[660px] grid-cols-2 gap-3 border-t border-b py-3 sm:grid-cols-4"
      >
        <Button
          size={"sm"}
          variant={currentTab === "featured" ? "active" : "secondary"}
          className="w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("featured")}
        >
          <Star className="h-4 w-4" />
          <span className="text-sm font-medium">Featured</span>
        </Button>

        <Button
          size={"sm"}
          variant={currentTab === "all" ? "active" : "secondary"}
          className="w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("all")}
        >
          <List className="h-4 w-4" />
          <span className="text-sm font-medium">AI Generated</span>
        </Button>
        <Button
          size={"sm"}
          variant={currentTab === "recent" ? "active" : "secondary"}
          className="w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("recent")}
        >
          <HistoryIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Recent</span>
        </Button>
        <Button
          size={"sm"}
          variant={currentTab === "top" ? "active" : "secondary"}
          className="w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("top")}
        >
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Top</span>
        </Button>
      </div>
      {currentTab === "featured" ? (
        <QuestionCategoriesClient mode={mode} />
      ) : currentTab === "top" || currentTab == "recent" ? (
        <DynamicQuestionCategories
          questionMode={currentTab}
          mode={mode}
          key={currentTab}
        />
      ) : (
        <DataQuestionCategories mode={mode} />
      )}
    </>
  );
}
