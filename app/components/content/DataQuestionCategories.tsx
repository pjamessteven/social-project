"use client";

import {
  affirmingDetransQuestions,
  affirmingQuestionCategories,
  compareQuestions,
  questionCategories,
} from "@/app/lib/questions";
import { slugify } from "@/app/lib/utils";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import topicsHierarchy from "@/app/lib/topics_hierarchy.json";

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
  level = 0 
}: { 
  topic: TopicChild; 
  mode: "affirm" | "detrans" | "compare";
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasQuestions = topic.questions && topic.questions.length > 0;
  const hasChildren = topic.children && topic.children.length > 0;
  const isDev = process.env.NODE_ENV === "development";

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
    <div className={`mb-4 ${level > 0 ? 'ml-6' : ''}`}>
      <div 
        className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {(hasQuestions || hasChildren) && (
          <div className="mr-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )}
        <h3 className={`text-primary font-semibold ${level === 0 ? 'text-xl' : level === 1 ? 'text-lg' : 'text-base'}`}>
          {topic.title}
        </h3>
        <span className="text-muted-foreground ml-2 text-sm">
          ({topic.question_count} questions)
        </span>
      </div>

      {isExpanded && (
        <div className="mt-2">
          {hasQuestions && (
            <div className="grid gap-1 mb-4">
              {topic.questions!.map((question: string, questionIndex: number) => (
                <Link
                  prefetch={false}
                  href={getHref(question)}
                  key={questionIndex}
                >
                  <div className="flex flex-row items-center border-b pt-1 pb-2 ml-6">
                    <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-sm italic opacity-90">
                      <div className="mr-2 whitespace-nowrap">{"->"}</div>
                      <div>{question}</div>
                    </div>
                  </div>
                </Link>
              ))}
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
      )}
    </div>
  );
}

export function QuestionCategories({
  mode,
}: {
  mode: "affirm" | "detrans" | "compare";
}) {
  const isDev = process.env.NODE_ENV === "development";

  // Show hierarchical topics for detrans mode, fallback to original for others
  if (mode === "detrans") {
    const hierarchy = topicsHierarchy as TopicsHierarchy;
    
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h2 className="text-primary mb-2 text-3xl font-bold">
            {hierarchy.title}
          </h2>
          <p className="text-muted-foreground text-base">
            Total questions: {hierarchy.question_count.toLocaleString()}
          </p>
        </div>
        
        {hierarchy.children.map((topic, index) => (
          <TopicNode key={index} topic={topic} mode={mode} />
        ))}
      </div>
    );
  }

  // Original implementation for affirm and compare modes
  const questions =
    mode === "affirm"
      ? affirmingQuestionCategories
      : [...compareQuestions, ...affirmingQuestionCategories];

  return (
    <>
      {questions.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-8">
          <h3 className="text-primary mb-2 text-2xl font-bold">
            {category.title}
          </h3>
          <p className="text-muted-foreground mb-6 text-base">
            {category.description}
          </p>
          <div className="grid gap-1">
            {category.questions.map(
              (question: string, questionIndex: number) => (
                <Link
                  prefetch={false}
                  href={
                    mode === "affirm"
                      ? "/affirm/chat/" + slugify(question)
                      : "/compare/chat/" + slugify(question)
                  }
                  key={questionIndex}
                >
                  <div className="flex flex-row items-center border-b pt-1 pb-2">
                    <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-lg italic opacity-90">
                      <div className="mr-2 whitespace-nowrap">{"->"}</div>
                      <div>{question}</div>
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        </div>
      ))}
      {mode === "affirm" &&
        affirmingDetransQuestions.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-12">
            <h3 className="text-primary mb-4 text-2xl font-bold">
              {category.title}
            </h3>
            <p className="text-muted-foreground mb-6 text-base">
              {category.description}
            </p>
            <div className="grid gap-1">
              {category.questions.map(
                (question: string, questionIndex: number) => (
                  <div className="flex items-center" key={questionIndex}>
                    <Link
                      prefetch={false}
                      href={
                        (isDev ? "/chat/" : "https://detrans.ai/chat/") +
                        slugify(question)
                      }
                    >
                      <p className="text-muted-foreground hover:text-primary cursor-pointer text-lg italic opacity-90">
                        {"->"} {question}
                      </p>
                    </Link>
                    <ExternalLink className="ml-2 h-4" />
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
    </>
  );
}
