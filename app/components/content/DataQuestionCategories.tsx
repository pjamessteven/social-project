"use client";

import topicsHierarchy from "@/app/lib/topics_hierarchy.json";
import { slugify } from "@/app/lib/utils";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { QuestionCategories } from "./QuestionCategories";

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
}: {
  topic: TopicChild;
  mode: "affirm" | "detrans" | "compare";
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
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
        onToggle={(e) => setIsOpen(e.currentTarget.open)}
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
              {[...topic.children!]
                .sort((a, b) => b.question_count - a.question_count)
                .map((child, childIndex) => (
                  <TopicNode
                    key={childIndex}
                    topic={child}
                    mode={mode}
                    level={level + 1}
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
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();

  // Initialize tab state from URL params
  const [currentTab, setCurrentTab] = useState<"featured" | "all">("featured");

  // Sync state with URL params
  useEffect(() => {
    const newTab = searchParams?.get("all") !== null ? "all" : "featured";
    if (newTab !== currentTab) {
      setCurrentTab(newTab);
    }
  }, [searchParams, currentTab]);

  // Sort categories by question count (descending)
  const sortedHierarchy = [...hierarchy].sort(
    (a, b) => b.question_count - a.question_count,
  );

  return (
    <>
      <div
        id="question-tabs"
        className="grid max-w-[660px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3"
      >
        <Link href="/">
          <Button
            variant={currentTab === "featured" ? "default" : "secondary"}
            className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
          >
            <Heart className="h-4 w-4" />
            <span className="text-sm font-medium">Featured Questions</span>
          </Button>
        </Link>
        <Link href="/?all">
          <Button
            variant={currentTab === "all" ? "default" : "secondary"}
            className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
          >
            <Heart className="h-4 w-4" />
            <span className="text-sm font-medium">All Questions</span>
          </Button>
        </Link>
      </div>

      {currentTab === "featured" ? (
        <QuestionCategories mode={mode} />
      ) : (
        <div className="space-y-4">
          {sortedHierarchy.map((category, index) => (
            <details
              key={index}
              className="group"
              onToggle={(e) => setIsOpen(e.currentTarget.open)}
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
                {[...category.children]
                  .sort((a, b) => b.question_count - a.question_count)
                  .map((topic, topicIndex) => (
                    <TopicNode key={topicIndex} topic={topic} mode={mode} />
                  ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
