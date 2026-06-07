import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localesInfo } from "@/i18n/locales";
import ContactForm from "./ContactForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    openGraph: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      url: `https://detrans.ai/${locale}/contact`,
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: locale === "en" ? "en_US" : locale === "fr" ? "fr_FR" : "es_ES",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadata.title"),
      description: t("metadata.description"),
    },
    alternates: {
      canonical: `https://detrans.ai/${locale}/contact`,
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
          `https://detrans.ai/${l.code}/contact`,
        ]),
      ),
    },
  };
}

export default function ContactPage() {
  return <ContactForm />;
}
