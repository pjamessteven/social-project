"use client";

import topicsHierarchy from "@/app/lib/topics_hierarchy.json";
import { slugify } from "@/app/lib/utils";
import { Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

interface TopicChild {
  title: string;
  topic_id?: number;
  question_count: number;
  questions?: string[];
  children?: TopicChild[];
}

interface TopicsHierarchy {
  title: string;
  question_count: number;
  children: TopicChild[];
}

interface CategorySummary {
  title: string;
  question_count: number;
}

function TopicNode({
  topic,
  mode,
  level = 0,
  expandedSubcategories,
  onToggleSubcategory,
}: {
  topic: TopicChild;
  mode: "affirm" | "detrans" | "compare";
  level?: number;
  expandedSubcategories: Set<string>;
  onToggleSubcategory: (subcategoryId: string) => void;
}) {
  const subcategoryId = `subcategory-${topic.topic_id || slugify(topic.title)}`;
  const isOpen = expandedSubcategories.has(subcategoryId);
  const hasQuestions = topic.questions && topic.questions.length > 0;
  const hasChildren = topic.children && topic.children.length > 0;

  const getHref = (question: string) => {
    const slug = slugify(question);
    switch (mode) {
      case "detrans":
        return "/research/" + slug;
      case "affirm":
        return "/affirm/research/" + slug;
      case "compare":
        return "/compare/research/" + slug;
      default:
        return "/research/" + slug;
    }
  };

  const getTopicHref = (topicId: number, topicString: string) => {
    const slug = slugify(topicString);
    switch (mode) {
      case "detrans":
        return "/topic/" + topicId + "?" + slug;
      case "affirm":
        return "/affirm/topic/" + topicId + "?" + slug;
      default:
        return "/topic/" + topicId + "?" + slug;
    }
  };

  return (
    <div className={`ml-2 ${level > 0 ? "" : ""}`}>
      <details className="group" open={isOpen}>
        <summary
          className="flex cursor-pointer list-none items-center rounded p-2 mb-1 hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={(e) => {
            e.preventDefault();
            onToggleSubcategory(subcategoryId);
          }}
        >
          <div
            className={`mr-2 transition-transform ${isOpen ? "rotate-90" : ""}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <h3
            className={`text-primary font-semibold ${level === 0 ? "text-base sm:text-xl" : level === 1 ? "text-base sm:text-lg" : "text-base"}`}
          >
            {topic.title}
            <span className="text-muted-foreground ml-2 text-sm font-light whitespace-nowrap">
              ({topic.question_count} questions)
            </span>
          </h3>
        </summary>

        <div className="mt-2 mb-4 ml-4  border-l">

          {hasQuestions && (
            <div className="mb-4 grid gap-1">
              {topic.questions!.map(
                (question: string, questionIndex: number) => (
                  <Link
                    prefetch={false}
                    href={getHref(question)}
                    key={questionIndex}
                  >
                    <div className="ml-0 pl-2 flex flex-row items-center border-b pt-1 pb-2">
                      <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-base italic opacity-90 sm:text-lg">
                        <div className="mr-2 whitespace-nowrap">{"->"}</div>
                        <div>{question}</div>
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
          <Link
            prefetch={false}
            href={getTopicHref(topic.topic_id as number, topic.title)}
          >
            <div className="-mt-2 ml-0 pl-2 flex flex-row items-center border-b pb-2">
              <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-base italic opacity-90 sm:text-lg">
                <div className="mr-2 whitespace-nowrap">{"->"}</div>
                <div>
                  View all {topic.question_count} questions about this topic
                </div>
              </div>
            </div>
          </Link>
        </div>
      </details>
    </div>
  );
}

export function DataQuestionCategories({
  mode,
}: {
  mode: "affirm" | "detrans" | "compare";
}) {
  const isDev = process.env.NODE_ENV === "development";
  const fullHierarchy = topicsHierarchy as TopicsHierarchy[];
  const router = useRouter();
  const searchParams = useSearchParams();

  // Create category summaries for initial render
  const categorySummaries: CategorySummary[] = fullHierarchy.map(
    (category) => ({
      title: category.title,
      question_count: category.question_count,
    }),
  );

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSubcategories, setExpandedSubcategories] = useState<
    Set<string>
  >(new Set());
  const [loadedCategories, setLoadedCategories] = useState<
    Map<string, TopicsHierarchy>
  >(new Map());

  // Load expanded state from URL params on mount
  useEffect(() => {
    const expandedCats = searchParams.get("expanded_categories");
    const expandedSubs = searchParams.get("expanded_subcategories");

    if (expandedCats) {
      const categoryIds = expandedCats.split(",");
      setExpandedCategories(new Set(categoryIds));

      // Pre-load data for expanded categories
      const newLoadedCategories = new Map<string, TopicsHierarchy>();
      categoryIds.forEach((categoryId) => {
        const categoryData = fullHierarchy.find(
          (cat) => slugify(cat.title) === categoryId.replace("category-", ""),
        );
        if (categoryData) {
          newLoadedCategories.set(categoryId, categoryData);
        }
      });
      setLoadedCategories(newLoadedCategories);
    }
    if (expandedSubs) {
      setExpandedSubcategories(new Set(expandedSubs.split(",")));
    }
  }, [searchParams]);

  // Update URL params when expanded state changes
  const updateUrlParams = (
    newExpandedCategories: Set<string>,
    newExpandedSubcategories: Set<string>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newExpandedCategories.size > 0) {
      params.set(
        "expanded_categories",
        Array.from(newExpandedCategories).join(","),
      );
    } else {
      params.delete("expanded_categories");
    }

    if (newExpandedSubcategories.size > 0) {
      params.set(
        "expanded_subcategories",
        Array.from(newExpandedSubcategories).join(","),
      );
    } else {
      params.delete("expanded_subcategories");
    }

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    router.replace(newUrl, { scroll: false });
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);

      // Load category data if not already loaded
      const categoryTitle = categoryId
        .replace("category-", "")
        .replace(/-/g, " ");
      const categoryData = fullHierarchy.find(
        (cat) => slugify(cat.title) === categoryId.replace("category-", ""),
      );

      if (categoryData && !loadedCategories.has(categoryId)) {
        setLoadedCategories((prev) =>
          new Map(prev).set(categoryId, categoryData),
        );
      }
    }
    setExpandedCategories(newExpanded);
    updateUrlParams(newExpanded, expandedSubcategories);
  };

  const toggleSubcategory = (subcategoryId: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(subcategoryId)) {
      newExpanded.delete(subcategoryId);
    } else {
      newExpanded.add(subcategoryId);
    }
    setExpandedSubcategories(newExpanded);
    updateUrlParams(expandedCategories, newExpanded);
  };

  return (
    <>
      {" "}
      <h3 className="text-primary hidden text-2xl font-bold sm:mb-2 hidden">
        Generated Topics
      </h3>
      <p className="text-muted-foreground hidden mt-2 mb-2 max-w-2xl text-sm sm:text-base ">
        These generated questions give an idea about the most discussed topics
        in /r/detrans.
      </p>
      <Accordion type="single" collapsible className="mb-2 sm:mb-4 ">
        <AccordionItem value="info" className="border-t border-l border-r rounded-xl overflow-hidden">
          <AccordionTrigger className="text-muted-foreground py-2 px-3 text-sm font-regular hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              These topics and quesions are generated from the data.
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground max-w-2xl space-y-3 p-3 ">
            <p>
              detrans.ai works in part by generating questions for every comment
              in /r/detrans. Instead of using AI to find answers, it uses AI to
              find questions—almost like working in reverse. This helps the system
              find personal stories and experiences that match what you're looking
              for.
            </p>
            <p>
              The questions are grouped by topic using a tool called BERTopic,
              though not all questions fit neatly into categories.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="-ml-1 space-y-4">
        {categorySummaries.map((categorySummary, index) => {
          const categoryId = `category-${slugify(categorySummary.title)}`;
          const isOpen = expandedCategories.has(categoryId);
          const categoryData = loadedCategories.get(categoryId);

          return (
            <details key={index} className="group mb-0 sm:mb-2" open={isOpen}>
              <summary
                className="flex cursor-pointer list-none items-center rounded py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={(e) => {
                  e.preventDefault();
                  toggleCategory(categoryId);
                }}
              >
                <div
                  className={`mr-2 transition-transform ${isOpen ? "rotate-90" : ""}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <h2 className="text-primary text-base font-semibold sm:text-xl">
                  {categorySummary.title}
                  <span className="text-muted-foreground ml-2 text-sm font-light whitespace-nowrap">
                    ({categorySummary.question_count} questions)
                  </span>
                </h2>
              </summary>

              {isOpen && categoryData && (
                <div className="mt-2 ml-2 border-l">
                  {[...categoryData.children].map((topic, topicIndex) => (
                    <TopicNode
                      key={topicIndex}
                      topic={topic}
                      mode={mode}
                      expandedSubcategories={expandedSubcategories}
                      onToggleSubcategory={toggleSubcategory}
                    />
                  ))}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </>
  );
}
