"use client";

import { useLocale } from "next-intl";

const rtlLocales = new Set(["he", "ar", "fa", "ur"]);

export function useIsRtl() {
  const locale = useLocale();
  return rtlLocales.has(locale);
}
