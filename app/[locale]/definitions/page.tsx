"use server";

import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("definitions.metadata");

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://detrans.ai/definitions",
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: locale === "es" ? "es_ES" : locale === "fr" ? "fr_FR" : "en_US",
      type: "website",
    },
  };
}

export default async function DefinitionsPage({ params }: Props) {
  const t = await getTranslations("definitions");

  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      <h2>{t("sexAndGender.heading")}</h2>
      <p>{t("sexAndGender.intro")}</p>

      <p>{t.rich("sexAndGender.sex", { b: (chunks) => <b>{chunks}</b> })}</p>

      <p>{t.rich("sexAndGender.gender", { b: (chunks) => <b>{chunks}</b> })}</p>

      <p>
        {t.rich("sexAndGender.nonConformity", {
          b: (chunks) => <b>{chunks}</b>,
        })}
      </p>

      <p>
        {t.rich("sexAndGender.identity", { b: (chunks) => <b>{chunks}</b> })}
      </p>

      <h2>{t("dysphoria.heading")}</h2>
      <p>{t("dysphoria.p1")}</p>
      <p>{t("dysphoria.p2")}</p>

      <h2>{t("transgender.heading")}</h2>
      <p>{t("transgender.p1")}</p>
      <p>{t("transgender.p2")}</p>

      <h2>{t("desistance.heading")}</h2>
      <p>{t("desistance.p1")}</p>

      <h2>{t("detransition.heading")}</h2>
      <p>{t("detransition.p1")}</p>

      <h2>{t("regret.heading")}</h2>
      <p>{t("regret.p1")}</p>

      <hr />

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t("source.text")}{" "}
        <a
          href="https://www.detransfoundation.com/sex-and-gender-definitions.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {t("source.link")}
        </a>
      </p>
    </div>
  );
}
