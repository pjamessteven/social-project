import { locales } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StartPage } from "../components/content/StartPage";

const localeToBcp47: Record<string, string> = {
  en: "en-US",
  ar: "ar-SA",
  bg: "bg-BG",
  cz: "cs-CZ",
  da: "da-DK",
  de: "de-DE",
  el: "el-GR",
  es: "es-ES",
  fa: "fa-IR",
  fi: "fi-FI",
  fr: "fr-FR",
  he: "he-IL",
  hi: "hi-IN",
  hu: "hu-HU",
  id: "id-ID",
  it: "it-IT",
  ja: "ja-JP",
  ko: "ko-KR",
  lt: "lt-LT",
  nl: "nl-NL",
  no: "no-NO",
  pl: "pl-PL",
  pt: "pt-PT",
  ro: "ro-RO",
  ru: "ru-RU",
  sl: "sl-SI",
  sv: "sv-SE",
  th: "th-TH",
  tr: "tr-TR",
  uk: "uk-UA",
  vi: "vi-VN",
  "zh-cn": "zh-CN",
  "zh-tw": "zh-TW",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  const resolvedSearchParams = await searchParams;

  const tMetadata = await getTranslations({ locale, namespace: "metadata" });
  const tHome = await getTranslations({ locale, namespace: "home" });

  const siteUrl = `https://detrans.ai/${locale}`;
  const inLanguage = localeToBcp47[locale] || locale;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "detrans.ai",
        url: siteUrl,
        description: tMetadata("description"),
        inLanguage,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/research?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `https://detrans.ai/#organization`,
        name: "detrans.ai",
        url: "https://detrans.ai/",
        description: tHome("aboutDetransition.supportDescription"),
        logo: "https://detrans.ai/x_card_lg.png",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "detrans.ai",
        applicationCategory: "HealthApplication",
        operatingSystem: "Any",
        description: tMetadata("description"),
        url: siteUrl,
        inLanguage,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pb-16">
        <StartPage locale={locale} searchParams={resolvedSearchParams} />
      </div>
    </>
  );
}
