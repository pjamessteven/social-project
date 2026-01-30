"use client";
import { useIsRtl } from "@/app/hooks/useIsRtl";
import { questionCategories as questionCategoriesEn } from "@/app/lib/questions";
import { questionCategories as questionCategoriesBg } from "@/app/lib/questions.bg";
import { questionCategories as questionCategoriesCz } from "@/app/lib/questions.cz";
import { questionCategories as questionCategoriesDa } from "@/app/lib/questions.da";
import { questionCategories as questionCategoriesDe } from "@/app/lib/questions.de";
import { questionCategories as questionCategoriesEl } from "@/app/lib/questions.el";
import { questionCategories as questionCategoriesEs } from "@/app/lib/questions.es";
import { questionCategories as questionCategoriesFa } from "@/app/lib/questions.fa";
import { questionCategories as questionCategoriesFi } from "@/app/lib/questions.fi";
import { questionCategories as questionCategoriesFr } from "@/app/lib/questions.fr";
import { questionCategories as questionCategoriesHe } from "@/app/lib/questions.he";
import { questionCategories as questionCategoriesHi } from "@/app/lib/questions.hi";
import { questionCategories as questionCategoriesHu } from "@/app/lib/questions.hu";
import { questionCategories as questionCategoriesId } from "@/app/lib/questions.id";
import { questionCategories as questionCategoriesIt } from "@/app/lib/questions.it";
import { questionCategories as questionCategoriesJa } from "@/app/lib/questions.ja";
import { questionCategories as questionCategoriesKo } from "@/app/lib/questions.ko";
import { questionCategories as questionCategoriesLt } from "@/app/lib/questions.lt";
import { questionCategories as questionCategoriesNl } from "@/app/lib/questions.nl";
import { questionCategories as questionCategoriesNo } from "@/app/lib/questions.no";
import { questionCategories as questionCategoriesPl } from "@/app/lib/questions.pl";
import { questionCategories as questionCategoriesPt } from "@/app/lib/questions.pt";
import { questionCategories as questionCategoriesRo } from "@/app/lib/questions.ro";
import { questionCategories as questionCategoriesRu } from "@/app/lib/questions.ru";
import { questionCategories as questionCategoriesSl } from "@/app/lib/questions.sl";
import { questionCategories as questionCategoriesSv } from "@/app/lib/questions.sv";
import { questionCategories as questionCategoriesTh } from "@/app/lib/questions.th";
import { questionCategories as questionCategoriesVi } from "@/app/lib/questions.vi";
import { questionCategories as questionCategoriesTr } from "@/app/lib/questions.tr";
import { questionCategories as questionCategoriesUk } from "@/app/lib/questions.uk";
import { questionCategories as questionCategoriesZhCn } from "@/app/lib/questions.zh-cn";
import { questionCategories as questionCategoriesZhTw } from "@/app/lib/questions.zh-tw";
import { cn, slugify } from "@/app/lib/utils";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

const questionCategoriesMap: Record<string, typeof questionCategoriesEn> = {
  en: questionCategoriesEn,
  bg: questionCategoriesBg,
  cz: questionCategoriesCz,
  da: questionCategoriesDa,
  de: questionCategoriesDe,
  el: questionCategoriesEl,
  es: questionCategoriesEs,
  fa: questionCategoriesFa,
  fi: questionCategoriesFi,
  fr: questionCategoriesFr,
  he: questionCategoriesHe,
  hi: questionCategoriesHi,
  hu: questionCategoriesHu,
  id: questionCategoriesId,
  it: questionCategoriesIt,
  ja: questionCategoriesJa,
  ko: questionCategoriesKo,
  lt: questionCategoriesLt,
  nl: questionCategoriesNl,
  no: questionCategoriesNo,
  pl: questionCategoriesPl,
  pt: questionCategoriesPt,
  ro: questionCategoriesRo,
  ru: questionCategoriesRu,
  sl: questionCategoriesSl,
  sv: questionCategoriesSv,
  th: questionCategoriesTh,
  tr: questionCategoriesTr,
  vi: questionCategoriesVi,
  uk: questionCategoriesUk,
  "zh-cn": questionCategoriesZhCn,
  "zh-tw": questionCategoriesZhTw,
};

export function QuestionCategoriesClient({
  mode,
}: {
  mode?: "detrans" | "affirm" | "compare";
}) {
  const locale = useLocale();
  const isRtl = useIsRtl();

  // Select the appropriate question set based on locale, fallback to English
  const questionCategories = questionCategoriesMap[locale] || questionCategoriesEn;

  const questions = questionCategories;

  return (
    <>
      {questions.map((category, categoryIndex) => (
        <Accordion
          key={categoryIndex}
          type="single"
          collapsible
          dir={isRtl ? "rtl" : "ltr"}
          className="w-full border-b"
        >
          <AccordionItem
            value="disclaimer"
            className="overflow-hidden border-none"
          >
            <AccordionTrigger isRtl={isRtl} className="py-3 text-base !font-normal hover:no-underline">
              <div className={isRtl ? "text-right" : "text-left"}>
                <h3 className="text-primary mb-1 text-lg font-semibold">
                  {category.title}
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {category.description}
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="mt-1 max-w-full pb-3 text-base no-underline">
              <div className="grid gap-1">
                {category.questions.map(
                  (question: string, questionIndex: number) => (
                    <Link
                      prefetch={false}
                      href={"/research/" + slugify(question)}
                      key={questionIndex}
                    >
                      <div
                        className={cn(
                          "flex flex-row items-center pt-1",
                          questionIndex < category.questions.length - 1 &&
                            "border-b pb-2",
                        )}
                      >
                        <div className={cn(
                          "text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start text-lg italic opacity-90 transition-colors",
                          isRtl && "flex-row-reverse"
                        )}>
                          <span className={cn(
                            "whitespace-nowrap",
                            isRtl ? "ml-2" : "mr-2"
                          )}>
                            {isRtl ? "<-" : "->"}
                          </span>
                          <span className={cn(
                            isRtl ? "pl-2" : "pr-2",
                            isRtl && "text-right"
                          )}>{question}</span>
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
    </>
  );
}
