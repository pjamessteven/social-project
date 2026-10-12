import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

type Messages = { [key: string]: string | Messages };

/**
 * Fills keys missing from a locale with the English source, so newly added
 * strings render in English until their translation lands instead of
 * surfacing next-intl missing-message errors.
 */
function withFallback(messages: Messages, fallback: Messages): Messages {
  const merged: Messages = { ...fallback };
  for (const [key, value] of Object.entries(messages)) {
    const base = fallback[key];
    merged[key] =
      typeof value === "object" && base && typeof base === "object"
        ? withFallback(value, base)
        : value;
  }
  return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  const messages = (await import(`../messages/${locale}.json`))
    .default as Messages;
  if (locale === "en") return { locale, messages };

  const english = (await import(`../messages/en.json`)).default as Messages;
  return { locale, messages: withFallback(messages, english) };
});
