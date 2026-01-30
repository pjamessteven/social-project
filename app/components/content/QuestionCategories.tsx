"use server";
import {
  questionCategories as questionCategoriesBg,
} from "@/app/lib/questions.bg";
import {
  questionCategories as questionCategoriesCz,
} from "@/app/lib/questions.cz";
import {
  questionCategories as questionCategoriesDa,
} from "@/app/lib/questions.da";
import {
  questionCategories as questionCategoriesDe,
} from "@/app/lib/questions.de";
import {
  questionCategories as questionCategoriesEl,
} from "@/app/lib/questions.el";
import { questionCategories as questionCategoriesEn } from "@/app/lib/questions";
import {
  questionCategories as questionCategoriesEs,
} from "@/app/lib/questions.es";
import {
  questionCategories as questionCategoriesFa,
} from "@/app/lib/questions.fa";
import {
  questionCategories as questionCategoriesFi,
} from "@/app/lib/questions.fi";
import {
  questionCategories as questionCategoriesFr,
} from "@/app/lib/questions.fr";
import {
  questionCategories as questionCategoriesHe,
} from "@/app/lib/questions.he";
import {
  questionCategories as questionCategoriesHi,
} from "@/app/lib/questions.hi";
import {
  questionCategories as questionCategoriesHu,
} from "@/app/lib/questions.hu";
import {
  questionCategories as questionCategoriesId,
} from "@/app/lib/questions.id";
import {
  questionCategories as questionCategoriesIt,
} from "@/app/lib/questions.it";
import {
  questionCategories as questionCategoriesJa,
} from "@/app/lib/questions.ja";
import {
  questionCategories as questionCategoriesKo,
} from "@/app/lib/questions.ko";
import {
  questionCategories as questionCategoriesLt,
} from "@/app/lib/questions.lt";
import {
  questionCategories as questionCategoriesNl,
} from "@/app/lib/questions.nl";
import {
  questionCategories as questionCategoriesNo,
} from "@/app/lib/questions.no";
import {
  questionCategories as questionCategoriesPl,
} from "@/app/lib/questions.pl";
import {
  questionCategories as questionCategoriesPt,
} from "@/app/lib/questions.pt";
import {
  questionCategories as questionCategoriesRo,
} from "@/app/lib/questions.ro";
import {
  questionCategories as questionCategoriesRu,
} from "@/app/lib/questions.ru";
import {
  questionCategories as questionCategoriesTh,
} from "@/app/lib/questions.th";
import {
  questionCategories as questionCategoriesTr,
} from "@/app/lib/questions.tr";
import {
  questionCategories as questionCategoriesUk,
} from "@/app/lib/questions.uk";
import { slugify } from "@/app/lib/utils";
import { Link } from "@/i18n/routing";

// Question categories map for all supported locales
const questionCategoriesMap: Record<string, typeof questionCategoriesEn> = {
  bg: questionCategoriesBg,
  cz: questionCategoriesCz,
  da: questionCategoriesDa,
  de: questionCategoriesDe,
  el: questionCategoriesEl,
  en: questionCategoriesEn,
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
  th: questionCategoriesTh,
  tr: questionCategoriesTr,
  uk: questionCategoriesUk,
};

export async function QuestionCategories({
  locale = "en",
  mode,
}: {
  locale?: string;
  mode?: "detrans" | "affirm" | "compare";
}) {
  const isDev = process.env.NODE_ENV === "development";

  // Select questions based on locale, fallback to English if not found
  const questionCategories = questionCategoriesMap[locale] ?? questionCategoriesEn;

  const questions = questionCategories;

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
                    href={"/research/" + slugify(question)}
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
      </div>
    </>
  );
}
