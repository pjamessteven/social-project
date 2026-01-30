/**
 * Detects the best matching locale from the browser's Accept-Language header
 * Falls back to the default locale if no match is found
 */
export function detectBrowserLocale(
  acceptLanguage: string | null,
  supportedLocales: readonly string[],
  defaultLocale: string,
): string {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,fr;q=0.8")
  const locales = acceptLanguage
    .split(",")
    .map((lang) => {
      const [locale, quality] = lang.trim().split(";q=");
      return {
        locale: locale.trim(),
        quality: quality ? parseFloat(quality) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find the best matching locale
  for (const { locale } of locales) {
    // Try exact match first (e.g., "en-US" matches "en-US")
    const exactMatch = supportedLocales.find(
      (supported) => supported.toLowerCase() === locale.toLowerCase(),
    );
    if (exactMatch) {
      return exactMatch;
    }

    // Try language-only match (e.g., "en-US" matches "en")
    const languageCode = locale.split("-")[0].toLowerCase();
    const languageMatch = supportedLocales.find(
      (supported) => supported.toLowerCase() === languageCode,
    );
    if (languageMatch) {
      return languageMatch;
    }
  }

  return defaultLocale;
}
