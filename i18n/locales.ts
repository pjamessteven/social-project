/**
 * Centralized locales configuration
 * This is the single source of truth for all supported languages
 * 
 * All translation files in /messages/ should be reflected here:
 * en.json, es.json, fr.json
 */

export interface LocaleInfo {
  code: string;
  label: string;
  englishName: string;
}

// All supported locales with their native names
export const localesInfo: readonly LocaleInfo[] = [
  { code: "en", label: "English", englishName: "English" },
  { code: "es", label: "Español", englishName: "Spanish" },
  { code: "fr", label: "Français", englishName: "French" },
  { code: "nl", label: "Nederlands", englishName: "Dutch" },
] as const;

// Extract just the locale codes for use in routing and other places
export const locales = localesInfo.map((l) => l.code) as readonly string[];

// Default locale
export const defaultLocale = "en" as const;

// Type for locale codes
export type Locale = (typeof locales)[number];

/**
 * Get locale info by code
 */
export function getLocaleInfo(code: string): LocaleInfo | undefined {
  return localesInfo.find((l) => l.code === code);
}

/**
 * Get language name by locale code
 * @param code - The locale code (e.g., "en", "es")
 * @param useEnglish - Whether to return the English name instead of native name
 */
export function getLanguageName(code: string, useEnglish = false): string {
  const locale = getLocaleInfo(code);
  if (!locale) return code.toUpperCase();
  return useEnglish ? locale.englishName : locale.label;
}

/**
 * Get all locale codes as an array
 * Useful for sitemap generation and middleware
 */
export function getAllLocales(): readonly string[] {
  return locales;
}

/**
 * Check if a locale code is supported
 */
export function isValidLocale(code: string): boolean {
  return locales.includes(code);
}

/**
 * List of RTL (Right-to-Left) languages
 */
export const rtlLocales: readonly string[] = ["he", "fa"] as const;

/**
 * Check if a locale is RTL (Right-to-Left)
 */
export function isRTL(code: string): boolean {
  return rtlLocales.includes(code);
}

/**
 * Get text direction for a locale
 * @returns 'rtl' for RTL languages, 'ltr' for all others
 */
export function getDirection(code: string): "rtl" | "ltr" {
  return isRTL(code) ? "rtl" : "ltr";
}
