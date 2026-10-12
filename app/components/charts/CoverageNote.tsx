"use client";

import { useTranslations } from "next-intl";

/**
 * Small "n of cohort" line shown under a chart so percentages stay
 * interpretable when filters shrink the cohort.
 */
export default function CoverageNote({
  n,
  cohort,
  className,
}: {
  n: number;
  cohort: number;
  className?: string;
}) {
  const t = useTranslations("statsPage.features");
  const percent = cohort > 0 ? Math.round((n / cohort) * 100) : 0;
  return (
    <p className={`text-muted-foreground text-sm ${className ?? ""}`}>
      {t("coverageNote", { n, cohort, percent })}
    </p>
  );
}
