"use client";

import { useTranslations } from "next-intl";
import { chatAgentPrompt } from "../../lib/prompts";

export default function PromptsPage() {
  const t = useTranslations("prompts");

  return (
    <div className="min-h-screen pb-16 lg:pt-8">
      <div className="prose dark:prose-invert">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p>
          {t.rich("intro.paragraph1", {
            bold: (chunks) => <b>{chunks}</b>,
            reddit: (chunks) => (
              <a
                href="https://reddit.com/r/detrans"
                target="_blank"
                className="text-blue-500 underline hover:text-blue-600"
              >
                {chunks}
              </a>
            ),
            llamaIndex: (chunks) => (
              <a
                href="https://docs.llamaindex.ai/en/stable/"
                target="_blank"
                className="text-blue-500 underline hover:text-blue-600"
              >
                {chunks}
              </a>
            ),
            kimi: (chunks) => (
              <a
                href="https://mimo.xiaomi.com/index"
                target="_blank"
                className="whitespace-nowrap text-blue-500 underline hover:text-blue-600"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <p className="mt-2">
          {t.rich("intro.paragraph2", {
            chatgpt: (chunks) => (
              <a
                href="https://chatgpt.com"
                target="_blank"
                className="text-blue-500 underline hover:text-blue-600"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <h2>{t("dataCutoff.title")}</h2>
        <p>
          {t.rich("dataCutoff.paragraph1", {
            bold: (chunks) => <b>{chunks}</b>,
            date: (chunks) => <b>{chunks}</b>,
          })}
        </p>
        <p>{t("dataCutoff.paragraph2")}</p>
        <h2>{t("openSource.title")}</h2>
        <p>
          {t.rich("openSource.paragraph", {
            github: (chunks) => (
              <a
                href="https://github.com/pjamessteven/social-project"
                target="_blank"
                className="underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <h2>{t("systemPrompts.title")}</h2>
        <p>{t("systemPrompts.description")}</p>
        <p>
          {t("systemPrompts.lastUpdated")}: <i>1/4/26</i>
        </p>
        <div className="not-prose mx-auto mt-8 max-w-5xl space-y-8">
          {/* Agent Prompt Card */}
          <div className="overflow-hidden rounded-xl bg-white shadow-lg">
            <div className="bg-gray-800 px-6 py-4 text-white">
              <h2 className="font-mono text-xl font-bold">
                {t("systemPrompts.chatAgentTitle")}
              </h2>
            </div>
            <div className="overflow-x-auto bg-gray-900 p-6 font-mono text-sm text-gray-200">
              <pre className="whitespace-pre-wrap">{chatAgentPrompt}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
