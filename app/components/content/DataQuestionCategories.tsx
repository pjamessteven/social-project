"use server";

import topicsHierarchy from "@/app/lib/topics_hierarchy.json";
import { slugify } from "@/app/lib/utils";
import Link from "next/link";

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

  if (!hasQuestions && !hasChildren) {
    return (
      <div className={`mb-2 ${level > 0 ? "ml-6" : ""}`}>
        <h3
          className={`text-primary font-semibold ${level === 0 ? "text-xl" : level === 1 ? "text-lg" : "text-base"}`}
        >
          {topic.title}
        </h3>
        <span className="text-muted-foreground ml-2 text-sm">
          ({topic.question_count} questions)
        </span>
      </div>
    );
  }

  return (
    <div className={`mb-4 ${level > 0 ? "ml-6" : ""}`}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="mr-2 transition-transform group-open:rotate-90">
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
                      <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-sm italic opacity-90">
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
              {topic.children!.map((child, childIndex) => (
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

export async function DataQuestionCategories({
  mode,
}: {
  mode: "affirm" | "detrans" | "compare";
}) {
  const isDev = process.env.NODE_ENV === "development";

  const hierarchy = topicsHierarchy as TopicsHierarchy[];

  return hierarchy.map((category, index) => (
    <div className="space-y-4" key={index}>
      <div className="mb-6">
        <h2 className="text-primary mb-2 text-3xl font-bold">
          {category.title}
        </h2>
        <p className="text-muted-foreground text-base">
          Total questions: {category.question_count}
        </p>
      </div>

      {category.children.map((topic, index) => (
        <TopicNode key={index} topic={topic} mode={mode} />
      ))}
    </div>
  ));
}
