"use client";

import { useTranslations } from "next-intl";
import { prettifyKey } from "./useFeatureData";

/**
 * Resolves display labels for taxonomy features and choice options.
 *
 * Translations live under `statsPage.featureLabels.<featureKey>` and
 * `statsPage.optionLabels.<optionKey>` in the next-intl message files (see
 * scripts/generate-feature-translations.ts). When a translation is missing we
 * fall back to the DB label (English) or a prettified option key.
 */
export function useFeatureLabels() {
  const t = useTranslations("statsPage");

  return {
    feature: (key: string, fallback: string) =>
      t.has(`featureLabels.${key}`) ? t(`featureLabels.${key}`) : fallback,
    option: (key: string) =>
      t.has(`optionLabels.${key}`)
        ? t(`optionLabels.${key}`)
        : prettifyKey(key),
  };
}
