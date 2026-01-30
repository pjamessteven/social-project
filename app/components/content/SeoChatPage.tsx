"use server";

import type { Locale } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { marked } from "marked";
import { QuestionCategories } from "./QuestionCategories";

interface SeoPageProps {
  mode: "detrans" | "affirm";
  question?: string;
  answer?: string;
  locale?: string;
}

export default async function SeoChatPage({
  mode,
  question,
  answer,
  locale = "en",
}: SeoPageProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "seo.chat",
  });

  return (
    <>
      <h1 className="text-3xl font-bold capitalize">{question}</h1>
      <br />

      <h2>
        {t("subtitle")}
      </h2>
      <br />
      {answer && (
        <article
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: marked.parse(answer) }}
        />
      )}
      <h2 className="mt-4">
        {t("freedomMessage")}
      </h2>

      <h1 className="mt-16 text-3xl font-bold">
        {t("moreQuestions", { question: question ?? "" })}
      </h1>
      <br />
      <div className="my-16">
        <QuestionCategories mode={mode} locale={locale} />
      </div>
    </>
  );
}
