"use server";

import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localesInfo } from "@/i18n/locales";
import DonationBox from "../../components/content/DonationBox";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "donatePage" });

  return {
    title: `${t("title")} | detrans.ai`,
    description: t("description2"),
    openGraph: {
      title: `${t("title")} | detrans.ai`,
      description: t("description2"),
      url: `https://detrans.ai/${locale}/donate`,
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: locale === "en" ? "en_US" : locale === "fr" ? "fr_FR" : "es_ES",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${t("title")} | detrans.ai`,
      description: t("description2"),
    },
    alternates: {
      canonical: `https://detrans.ai/${locale}/donate`,
      languages: Object.fromEntries(
        localesInfo.map((l) => [
          l.code === "en"
            ? "en-US"
            : l.code === "es"
              ? "es-ES"
              : l.code === "fr"
                ? "fr-FR"
                : l.code === "zh-cn"
                  ? "zh-CN"
                  : l.code === "zh-tw"
                    ? "zh-TW"
                    : `${l.code}-${l.code.toUpperCase()}`,
          `https://detrans.ai/${l.code}/donate`,
        ]),
      ),
    },
  };
}

export default async function DonationPage() {
  const t = await getTranslations("donatePage");

  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h2>{t("title")}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
        <div className="">
          <p>{t.rich("description1", { b: (chunks) => <b>{chunks}</b> })}</p>
          <p>{t("description2")}</p>
          <p>{t("description3")}</p>

          <div className="mt-8 flex max-w-[400px] items-center overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800">
            <DonationBox />
          </div>
          <div className="mt-4 mb-4 flex max-w-md items-center space-x-1 rounded-xl bg-white px-4 shadow-md dark:bg-gray-800">
            <div className="mb-4 flex-1 font-mono break-all">
              <p className="text-sm font-medium opacity-70">
                {t("bankAccount")}
              </p>
              {t("accountName")}: PETER STEVEN
              <br /> {t("accountNumber")}: 38-9011-0035365-00 (KIWINZ22)
              <br /> {t("swiftCode")}: KIWINZ22
            </div>
          </div>
          <div className="flex max-w-md items-center space-x-1 rounded-xl bg-white px-4 shadow-md dark:bg-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium opacity-70">{t("bitcoin")}</p>
              <p id="btc-address" className="font-mono break-all">
                bc1qtag945t26vspn7gnh9vaczqpgpkgqwf0j2l4ys
              </p>
            </div>
          </div>
        </div>
        <div className=""></div>
      </div>
    </div>
  );
}
