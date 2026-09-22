/** Shared SEO helpers (site URL + locale → BCP47 hreflang mapping). */

import { localesInfo } from "@/i18n/locales";
import { getPathname } from "@/i18n/routing";

export const SITE_URL = "https://detrans.ai";

/**
 * JSON safe to embed in a <script> tag: JSON.stringify leaves `</script>`
 * untouched, which would end the script element early (XSS via page
 * titles/summaries). Escaping `<` as \u003c is inert inside JSON strings.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Builds a `generateMetadata().alternates.languages` map for a static route,
 * using the localized pathnames table with an explicit `x-default`.
 */
export function buildLocalizedAlternates(href: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const info of localesInfo) {
    const path = getPathname({ href: href as never, locale: info.code });
    languages[localeToBcp47[info.code] ?? info.code] = `${SITE_URL}${path}`;
  }
  languages["x-default"] = `${SITE_URL}${getPathname({
    href: href as never,
    locale: "en",
  })}`;
  return languages;
}

export const localeToBcp47: Record<string, string> = {
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
