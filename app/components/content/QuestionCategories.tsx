"use server";
import {
  affirmingDetransQuestions,
  affirmingQuestionCategories,
  compareQuestions,
  questionCategories,
} from "@/app/lib/questions";
import { slugify } from "@/app/lib/utils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export async function QuestionCategories({
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
    <div>
      {questions.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-8">
          {category.title && (
            <>
              <h3 className="text-primary mb-2 text-2xl font-bold">
                {category.title}
              </h3>
              <p className="text-muted-foreground mb-6 text-base">
                {category.description}
              </p>
            </>
          )}
          <div className="grid gap-1">
            {category.questions.map(
              (question: string, questionIndex: number) => (
                <Link
                  prefetch={false}
                  href={
                    mode === "detrans"
                      ? "/research/" + slugify(question)
                      : mode === "affirm"
                        ? "/affirm/research/" + slugify(question)
                        : "/compare/research/" + slugify(question)
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
                  <Link
                    prefetch={false}
                    key={questionIndex}
                    href={
                      (isDev ? "/research/" : "https://detrans.ai/research/") +
                      slugify(question)
                    }
                  >
                    <div className="flex flex-row items-center border-b pt-1 pb-2">
                      <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-center text-lg italic opacity-90">
                        <div className="mr-2 whitespace-nowrap">{"->"}</div>
                        <div>{question}</div>
                        <ExternalLink className="ml-2 h-4" />
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
        </div>
    </>
  );
}
