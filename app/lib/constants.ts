// Shared constants for the application

/**
 * Maximum length for user input messages in characters
 */
export const MAX_MESSAGE_LENGTH = 1024;

/**
 * Character limits for study submissions
 */
export const MAX_STUDY_URL_LENGTH = 2048;
export const MAX_STUDY_TITLE_LENGTH = 500;

/**
 * Character limits for video submissions
 */
export const MAX_VIDEO_URL_LENGTH = 2048;
export const MAX_VIDEO_TITLE_LENGTH = 200;
export const MAX_VIDEO_AUTHOR_LENGTH = 100;

/**
 * Valid locale codes
 */
export const VALID_LOCALES = [
  "en",
  "ar",
  "bg",
  "cz",
  "da",
  "de",
  "el",
  "es",
  "fa",
  "fi",
  "fr",
  "he",
  "hi",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lt",
  "nl",
  "no",
  "pl",
  "pt",
  "ro",
  "ru",
  "sl",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh-cn",
  "zh-tw",
] as const;
