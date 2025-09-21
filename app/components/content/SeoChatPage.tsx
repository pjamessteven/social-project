"use server";

import { marked } from "marked";
import { QuestionCategories } from "./QuestionCategories";

interface SeoPageProps {
  mode: "detrans" | "affirm";
  question?: string;
  answer?: string;
}

export default async function SeoChatPage({
  mode,
  question,
  answer,
}: SeoPageProps) {
  return (
    <>
      <h1 className="text-3xl font-bold capitalize">{question}</h1>
      <br />

      <h2>
        Questions and answers for people who are questioning their gender
        identity.
      </h2>
      <br />
      {answer && (
        <article
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: marked.parse(answer) }}
        />
      )}
      <h2 className="mt-4">
        The truth is that gender non-conformity will set us all free!
      </h2>

      <h1 className="mt-16 text-3xl font-bold">
        More questions related to &quot;{question}&quot;
      </h1>
      <br />
      <div className="my-16">
        <QuestionCategories mode={mode} />
      </div>
    </>
  );
}
