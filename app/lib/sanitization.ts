/**
 * Input sanitization utilities
 */

/**
 * Sanitizes a string by:
 * - Trimming whitespace
 * - Removing null bytes
 * - Removing control characters (except newlines and tabs)
 * - Truncating to max length
 */
export function sanitizeString(
  input: string | null | undefined,
  maxLength?: number,
): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let sanitized = input
    .trim()
    .replace(/\x00/g, "") // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Remove control chars except \n, \r, \t

  if (maxLength && maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates and sanitizes a URL
 * Returns null if invalid
 */
export function sanitizeUrl(
  input: string | null | undefined,
  maxLength = 2048,
): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();

  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  // Check for common URL patterns
  const urlPattern = /^https?:\/\/.+/i;
  if (!urlPattern.test(trimmed)) {
    return null;
  }

  // Validate URL format
  try {
    const url = new URL(trimmed);
    // Only allow http and https protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Sanitizes a locale string
 * Returns the locale if valid, otherwise returns defaultLocale
 */
export function sanitizeLocale(
  input: string | null | undefined,
  validLocales: readonly string[],
  defaultLocale = "en",
): string {
  if (!input || typeof input !== "string") {
    return defaultLocale;
  }

  const normalized = input.trim().toLowerCase();

  if (validLocales.includes(normalized)) {
    return normalized;
  }

  return defaultLocale;
}

/**
 * Sanitizes an ID parameter (numeric)
 * Returns null if invalid
 */
export function sanitizeId(input: string | null | undefined): number | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  const num = parseInt(trimmed, 10);

  if (isNaN(num) || num < 1 || num > Number.MAX_SAFE_INTEGER) {
    return null;
  }

  // Check if the parsed number equals the original string (no extra characters)
  if (num.toString() !== trimmed) {
    return null;
  }

  return num;
}
