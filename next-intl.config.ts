import { LocalePrefix } from "next-intl/routing";

export default {
  locales: [
    "en", "bg", "cz", "da", "de", "el", "es", "fa", "fi", "fr",
    "he", "hi", "hu", "id", "it", "ja", "ko", "lt", "nl", "no",
    "pl", "pt", "ro", "ru", "sl", "sv", "th", "tr", "uk", "vi",
    "zh-cn", "zh-tw"
  ],
  defaultLocale: "en",
  localePrefix: "always" as LocalePrefix,
};
