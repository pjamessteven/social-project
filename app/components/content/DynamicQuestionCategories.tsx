"use client";
import {
  affirmingQuestionCategories,
  compareQuestions,
  questionCategories,
} from "@/app/lib/questions";
import { slugify } from "@/app/lib/utils";
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
      <div className="mb-8">
        <h3 className="text-primary mb-2 text-2xl font-bold">Top Questions</h3>
        <p className="text-muted-foreground mb-6 text-base">
          These are the top questions people have asked detrans.ai
        </p>
        <div className="grid gap-1">
          {category.questions.map((question: string, questionIndex: number) => (
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
                <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-lg italic opacity-90">
                  <div className="mr-2 whitespace-nowrap">{"->"}</div>
                  <div>{question}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
