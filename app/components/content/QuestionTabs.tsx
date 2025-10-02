import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "../ui/button";
import { DataQuestionCategories } from "./DataQuestionCategories";

interface QuestionTabsProps {
  mode: "affirm" | "detrans" | "compare";
  QuestionCategories: React.ComponentType<{ mode: "affirm" | "detrans" | "compare" }>;
}

export function QuestionTabs({ mode, QuestionCategories }: QuestionTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<"featured" | "all">("featured");

  // Sync state with URL params on mount
  useEffect(() => {
    const newTab = searchParams?.get("all") !== null ? "all" : "featured";
    setCurrentTab(newTab);
  }, [searchParams]);

  const handleTabChange = (tab: "featured" | "all") => {
    setCurrentTab(tab);
    if (tab === "all") {
      router.replace("/?all");
    } else {
      router.replace("/");
    }
  };

  return (
    <>
      <div
        id="question-tabs"
        className="grid max-w-[660px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3"
      >
        <Button
          variant={currentTab === "featured" ? "default" : "secondary"}
          className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("featured")}
        >
          <Heart className="h-4 w-4" />
          <span className="text-sm font-medium">Featured Questions</span>
        </Button>
        <Button
          variant={currentTab === "all" ? "default" : "secondary"}
          className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
          onClick={() => handleTabChange("all")}
        >
          <Heart className="h-4 w-4" />
          <span className="text-sm font-medium">All Questions</span>
        </Button>
      </div>
      {currentTab === "featured" ? (
        <QuestionCategories mode={mode} />
      ) : (
        <DataQuestionCategories mode={mode} />
      )}
    </>
  );
}
