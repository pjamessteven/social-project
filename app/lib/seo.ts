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

type LocalizedHref = Parameters<typeof getPathname>[0]["href"];

/** Absolute URL of a route in a locale, using the localized pathnames table. */
export function localizedUrl(href: LocalizedHref, locale: string): string {
  return `${SITE_URL}${getPathname({ href, locale })}`;
}

/**
 * Builds a `generateMetadata().alternates.languages` map for a route (static
 * href or `{ pathname, params }`), using the localized pathnames table with an
 * explicit `x-default`.
 */
export function buildLocalizedAlternates(
  href: LocalizedHref,
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const info of localesInfo) {
    languages[localeToBcp47[info.code] ?? info.code] = localizedUrl(
      href,
      info.code,
    );
  }
  languages["x-default"] = localizedUrl(href, "en");
  return languages;
}

/** `alternates` (canonical + hreflang) for a route available in every locale. */
export function buildAlternates(href: LocalizedHref, locale: string) {
  return {
    canonical: localizedUrl(href, locale),
    languages: buildLocalizedAlternates(href),
  };
}

/** Open Graph locale, e.g. `de_DE`. */
export function ogLocale(locale: string): string {
  return (localeToBcp47[locale] ?? locale).replace("-", "_");
}

/** BCP 47 tag for `<html lang>` (site codes like `cz` aren't valid tags). */
export function htmlLang(locale: string): string {
  if (locale === "cz") return "cs";
  if (locale === "zh-cn") return "zh-CN";
  if (locale === "zh-tw") return "zh-TW";
  return locale;
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
