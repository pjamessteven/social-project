import { getStudyCategoryPath } from "@/app/lib/study-category-urls";
import { getStudyPath } from "@/app/lib/study-urls";
import { Study } from "@/app/types/study";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

/** Pieces shared by the study card (chat) and the study list rows. */

const FALLBACK_KEY_POINTS = 3;

/**
 * Display data for a study: prefers the short card copy and falls back to
 * the long description / key points for studies that don't have it yet.
 */
export function getStudyDisplay(
  study: Study,
  locale?: string,
  currentCategoryId?: number,
) {
  // Localized slug when known; numeric ids stay valid (they redirect server-side)
  const slugOrId = study.slug || String(study.id);
  const categories = (study.categories ?? []).filter(
    (c) => c.id !== currentCategoryId,
  );
  return {
    detailHref: locale
      ? getStudyPath(locale, slugOrId)
      : `/studies/${slugOrId}`,
    summary: study.cardSummary || study.description,
    isShortSummary: !!study.cardSummary,
    keyPoints: study.cardKeyPoints?.length
      ? study.cardKeyPoints
      : (study.keyPoints ?? []).slice(0, FALLBACK_KEY_POINTS),
    method: categories.find((c) => c.kind === "method"),
    topics: categories.filter((c) => c.kind === "topic"),
  };
}

/** "Authors · Journal · 2024" */
export function StudyMeta({ study }: { study: Study }) {
  if (!study.authors && !study.journal && !study.year) return null;
  return (
    <p className="text-muted-foreground flex gap-1 text-xs">
      <span className="line-clamp-1">
        {study.authors}
        {study.authors && study.journal && " · "}
        {study.journal && <em>{study.journal}</em>}
      </span>
      {study.year && (
        <span className="shrink-0 tabular-nums">
          {(study.authors || study.journal) && "· "}
          {study.year}
        </span>
      )}
    </p>
  );
}

export function StudyKeyPoints({ points }: { points: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-gray-800 dark:text-gray-200">
      {points.map((point, i) => (
        <li key={i} className="flex gap-2">
          <span
            aria-hidden
            className="bg-muted-foreground/60 mt-2 h-1 w-1 shrink-0 rounded-full"
          />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

/** Method chip first, then topic chips; linked when localized. */
export function StudyTags({
  method,
  topics,
  locale,
}: Pick<ReturnType<typeof getStudyDisplay>, "method" | "topics"> & {
  locale?: string;
}) {
  const chips = method ? [method, ...topics] : topics;
  if (chips.length === 0) return null;

  const chipClass =
    "bg-secondary dark:bg-background/40 rounded-full border px-2 py-0.5 text-xs text-gray-700 no-underline dark:text-gray-300";
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {chips.map((chip) =>
        locale ? (
          <Link
            key={chip.id}
            href={getStudyCategoryPath(locale, chip.kind, chip.slug)}
            className={`${chipClass} hover:bg-secondary/70`}
          >
            {chip.name}
          </Link>
        ) : (
          <span key={chip.id} className={chipClass}>
            {chip.name}
          </span>
        ),
      )}
    </div>
  );
}

export function StudySourceLink({ url }: { url: string }) {
  const t = useTranslations("studiesPage");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-blue-600 no-underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {t("source")}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      {/* The link is `relative` so this absolutely positioned text stays
          inside <main>'s scroll container instead of stretching the page */}
      <span className="sr-only">(opens in new tab)</span>
    </a>
  );
}

export function PendingBadge() {
  return (
    <div className="rounded bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      Pending approval
    </div>
  );
}
