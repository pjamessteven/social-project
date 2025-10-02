"use client";

import { slugify } from "@/app/lib/utils";
import Link from "next/link";

export function TopicQuestions({ id }: { id: string }) {
  const subcategoryId = `subcategory-${topic.topic_id || slugify(topic.title)}`;
  const hasQuestions = topic.questions && topic.questions.length > 0;

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
    <div>
      <h3
        className={`text-primary font-semibold ${level === 0 ? "text-xl" : level === 1 ? "text-lg" : "text-base"}`}
      >
        {topic.title}
        <span className="text-muted-foreground ml-2 text-sm font-light">
          ({topic.question_count} questions)
        </span>
      </h3>

      <div className="mt-2 mb-4 ml-4 border-l">
        {hasQuestions && (
          <div className="mb-4 grid gap-1">
            {topic.questions!.map((question: string, questionIndex: number) => (
              <Link
                prefetch={false}
                href={getHref(question)}
                key={questionIndex}
              >
                <div className="ml-6 flex flex-row items-center border-b pt-1 pb-2">
                  <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-lg italic opacity-90">
                    <div className="mr-2 whitespace-nowrap">{"->"}</div>
                    <div>{question}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
