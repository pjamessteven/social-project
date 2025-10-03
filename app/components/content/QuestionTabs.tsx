"use client";

import { HistoryIcon, List, Star, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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

  const handleTabChange = (tab: string) => {
    const validTab = tab as "featured" | "all" | "top" | "recent";
    setCurrentTab(validTab);
    if (validTab === "featured") {
      router.replace("/", { scroll: false });
    } else {
      router.replace(`/?questions=${validTab}`, { scroll: false });
    }
  };

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList
        id="question-tabs"
        className="mb-8 grid max-w-[660px] grid-cols-2 gap-1 border-t border-b py-3 sm:grid-cols-4"
      >
        <TabsTrigger
          value="featured"
          className="flex-row items-center gap-2 rounded-xl p-4"
        >
          <Star className="h-4 w-4" />
          <span className="text-sm font-medium">Featured</span>
        </TabsTrigger>

        <TabsTrigger
          value="all"
          className="flex-row items-center gap-2 rounded-xl p-4"
        >
          <List className="h-4 w-4" />
          <span className="text-sm font-medium">All Topics</span>
        </TabsTrigger>

        <TabsTrigger
          value="recent"
          className="flex-row items-center gap-2 rounded-xl p-4"
        >
          <HistoryIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Recent</span>
        </TabsTrigger>

        <TabsTrigger
          value="top"
          className="flex-row items-center gap-2 rounded-xl p-4"
        >
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Top</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="featured">
        <QuestionCategoriesClient mode={mode} />
      </TabsContent>

      <TabsContent value="all">
        <DataQuestionCategories mode={mode} />
      </TabsContent>

      <TabsContent value="recent">
        <DynamicQuestionCategories
          questionMode="recent"
          mode={mode}
          key="recent"
        />
      </TabsContent>

      <TabsContent value="top">
        <DynamicQuestionCategories
          questionMode="top"
          mode={mode}
          key="top"
        />
      </TabsContent>
    </Tabs>
  );
}
