"use client";
import {
  affirmingDetransQuestions,
  affirmingQuestionCategories,
  compareQuestions,
  questionCategories,
} from "@/app/lib/questions";
import { slugify } from "@/app/lib/utils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export function QuestionCategoriesClient({
  mode,
}: {
  mode: "affirm" | "detrans" | "compare";
}) {
  const isDev = process.env.NODE_ENV === "development";

  const questions =
    mode === "detrans"
      ? questionCategories
      : mode === "affirm"
        ? affirmingQuestionCategories
        : [...compareQuestions, ...affirmingQuestionCategories];

  return (
    <>
      {questions.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-8">
          <h3 className="text-primary mb-2 text-2xl font-bold">
            {category.title}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base sm:mb-6">
            {category.description}
          </p>
          <div className="grid gap-1">
            {category.questions.map(
              (question: string, questionIndex: number) => (
                <Link
                  prefetch={false}
                  href={
                    mode === "detrans"
                      ? "/chat/" + slugify(question)
                      : mode === "affirm"
                        ? "/affirm/chat/" + slugify(question)
                        : "/compare/chat/" + slugify(question)
                  }
                  key={questionIndex}
                >
                  <div className="flex flex-row items-center border-b pt-1 pb-2">
                    <div className="text-muted-foreground transition-colors hover:text-primary flex cursor-pointer flex-row items-start text-base sm:text-lg italic opacity-90">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">{question}</span>
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
            <p className="text-muted-foreground mb-4 text-base sm:mb-6">
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
                      <p className="text-muted-foreground transition-colors hover:text-primary cursor-pointer text-lg italic opacity-90">
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
