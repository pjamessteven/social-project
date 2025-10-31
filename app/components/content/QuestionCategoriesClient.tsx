"use client";
import {
  affirmingDetransQuestions,
  affirmingQuestionCategories,
  compareQuestions,
  questionCategories,
} from "@/app/lib/questions";
import { cn, slugify } from "@/app/lib/utils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

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
        <Accordion
          key={categoryIndex}
          type="single"
          collapsible
          className="w-full border-b "
        >
          <AccordionItem
            value="disclaimer"
            className="overflow-hidden border-none "
          >
            <AccordionTrigger
              className=" py-3 text-base !font-normal hover:no-underline"
            >
              <div>
                <h3 className="text-primary mb-1 text-lg font-semibold">
                  {category.title}
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {category.description}
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className=" max-w-full mt-1 pb-3 text-base no-underline">
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
                      <div className={cn("flex flex-row items-center  pt-1  ", questionIndex < category.questions.length -1 && 'border-b pb-2')}>
                        <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start text-lg italic opacity-90 transition-colors">
                          <span className="mr-2 whitespace-nowrap ">{"->"}</span>
                          <span className="pr-2">{question}</span>
                        </div>
                      </div>
                    </Link>
                  ),
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
                        (isDev
                          ? "/research/"
                          : "https://detrans.ai/research/") + slugify(question)
                      }
                    >
                      <p className="text-muted-foreground hover:text-primary cursor-pointer text-lg italic opacity-90 transition-colors">
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
