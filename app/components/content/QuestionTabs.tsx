"use client";

import { HistoryIcon, List, Star, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const tabsRef = useRef<HTMLDivElement>(null);
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

    // Scroll to the top of the tabs container
    if (tabsRef.current) {
      tabsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Tabs
      ref={tabsRef}
      value={currentTab}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <div className="relative sticky top-0 z-10 pb-1">
        <div className="bg-[linear-gradient(to_bottom,theme(colors.background)_0px,theme(colors.background)_3rem,transparent_5rem)] pointer-events-none absolute z-20 h-40 w-screen dark:bg-[linear-gradient(to_bottom,black_0px,black_3rem,transparent_5rem)]" />

        <TabsList
          id="question-tabs"
          className="grid-cols- relative z-50 mb-6 grid h-12 grid-cols-4 gap-1 rounded-xl  sm:mb-6"
        >
          <TabsTrigger
            value="featured"
            className="flex-row items-center gap-2 rounded-lg py-2"
          >
            <Star className="hidden h-4 w-4 sm:block" />
            <span className="text-sm font-medium">Featured</span>
          </TabsTrigger>

          <TabsTrigger
            value="all"
            className="flex-row items-center gap-2 rounded-lg py-2"
          >
            <List className="hidden h-4 w-4 sm:block" />
            <span className="text-sm font-medium">
    Generated
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="recent"
            className="flex-row items-center gap-2 rounded-lg py-2"
          >
            <HistoryIcon className="hidden h-4 w-4 sm:block" />
            <span className="text-sm font-medium">Recent</span>
          </TabsTrigger>

          <TabsTrigger
            value="top"
            className="flex-row items-center gap-2 rounded-lg py-2"
          >
            <TrendingUp className="hidden h-4 w-4 sm:block" />
            <span className="text-sm font-medium">Top</span>
          </TabsTrigger>
        </TabsList>
      </div>
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
        <DynamicQuestionCategories questionMode="top" mode={mode} key="top" />
      </TabsContent>
    </Tabs>
  );
}
