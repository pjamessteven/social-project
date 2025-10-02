"use client";

import topicsHierarchy from "@/app/lib/topics_hierarchy.json";
import { slugify } from "@/app/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
        return "/chat/" + slug;
      case "affirm":
        return "/affirm/chat/" + slug;
      case "compare":
        return "/compare/chat/" + slug;
      default:
        return "/chat/" + slug;
    }
  };

  return (
    <div className={`ml-6 ${level > 0 ? "" : ""}`}>
      <details
        className="group"
        open={isOpen}
        onToggle={() => onToggleSubcategory(subcategoryId)}
      >
        <summary className="flex cursor-pointer list-none items-center rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
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
            className={`text-primary font-semibold ${level === 0 ? "text-xl" : level === 1 ? "text-lg" : "text-base"}`}
          >
            {topic.title}
          </h3>
          <span className="text-muted-foreground ml-2 text-sm">
            ({topic.question_count} questions)
          </span>
        </summary>

        <div className="mt-2">
          {hasQuestions && (
            <div className="mb-4 grid gap-1">
              {topic.questions!.map(
                (question: string, questionIndex: number) => (
                  <Link
                    prefetch={false}
                    href={getHref(question)}
                    key={questionIndex}
                  >
                    <div className="ml-6 flex flex-row items-center border-b pt-1 pb-2">
                      <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-base italic opacity-90">
                        <div className="mr-2 whitespace-nowrap">{"->"}</div>
                        <div>{question}</div>
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}

          {hasChildren && (
            <div>
              {[...topic.children!].map((child, childIndex) => (
                <TopicNode
                  key={childIndex}
                  topic={child}
                  mode={mode}
                  level={level + 1}
                  expandedSubcategories={expandedSubcategories}
                  onToggleSubcategory={onToggleSubcategory}
                />
              ))}
            </div>
          )}
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
  const hierarchy = topicsHierarchy as TopicsHierarchy[];
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  // Load expanded state from URL params on mount
  useEffect(() => {
    const expandedCats = searchParams.get('expanded_categories');
    const expandedSubs = searchParams.get('expanded_subcategories');
    
    if (expandedCats) {
      setExpandedCategories(new Set(expandedCats.split(',')));
    }
    if (expandedSubs) {
      setExpandedSubcategories(new Set(expandedSubs.split(',')));
    }
  }, [searchParams]);

  // Update URL params when expanded state changes
  const updateUrlParams = (newExpandedCategories: Set<string>, newExpandedSubcategories: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newExpandedCategories.size > 0) {
      params.set('expanded_categories', Array.from(newExpandedCategories).join(','));
    } else {
      params.delete('expanded_categories');
    }
    
    if (newExpandedSubcategories.size > 0) {
      params.set('expanded_subcategories', Array.from(newExpandedSubcategories).join(','));
    } else {
      params.delete('expanded_subcategories');
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newUrl, { scroll: false });
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
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
      <div className="space-y-4">
        {hierarchy.map((category, index) => {
          const categoryId = `category-${slugify(category.title)}`;
          const isOpen = expandedCategories.has(categoryId);
          
          return (
            <details
              key={index}
              className="group"
              open={isOpen}
              onToggle={() => toggleCategory(categoryId)}
            >
              <summary className="flex cursor-pointer list-none items-center rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
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
              <h2 className="text-primary text-xl font-bold">
                {category.title}
                <span className="text-muted-foreground ml-2 text-base">
                  ({category.question_count} questions)
                </span>
              </h2>
            </summary>

            <div className="mt-4">
              {[...category.children].map((topic, topicIndex) => (
                <TopicNode 
                  key={topicIndex} 
                  topic={topic} 
                  mode={mode} 
                  expandedSubcategories={expandedSubcategories}
                  onToggleSubcategory={toggleSubcategory}
                />
              ))}
            </div>
          </details>
        )})}
      </div>
    </>
  );
}
