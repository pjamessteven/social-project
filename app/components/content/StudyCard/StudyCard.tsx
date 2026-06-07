import { Study } from "@/app/types/study";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { StudyDescription } from "./StudyDescription";

export interface StudyCardProps {
  study: Study;
  isAdmin?: boolean;
  locale?: string;
  showDescription?: boolean;
}

export function StudyCard({
  study,
  isAdmin,
  locale,
  showDescription = true,
}: StudyCardProps) {
  const t = useTranslations("studiesPage");
  const detailHref = locale
    ? `/${locale}/studies/${study.id}`
    : `/studies/${study.id}`;

  const hasKeyPoints =
    study.approved && study.keyPoints && study.keyPoints.length > 0;

  return (
    <article className="prose dark:prose-invert dark:bg-secondary flex max-w-none flex-col rounded-xl border bg-white p-4 lg:flex-row lg:gap-6 lg:p-6">
      {/* Left column — main content */}
      <div className="flex w-full flex-col gap-3 lg:w-1/2">
        <div>
          <h2 className="!mt-0 !mb-1 text-base">
            <Link href={detailHref} className="no-underline hover:underline">
              {study.headline}
            </Link>
          </h2>
          <div className="mt-2 flex items-start justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex-1 italic">{study.title}</span>
            <span className="shrink-0">({study.year})</span>
          </div>
        </div>

        <p className="!m-0 text-sm text-gray-600 dark:text-gray-400">
          <span>{study.authors}</span>
          {study.journal && (
            <>
              &nbsp;(<em>{study.journal}</em>)
            </>
          )}
        </p>

        {/* Tags — methodology first (dark), then topics (light) */}
        {study.tags && study.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {study.tags
              .sort((a, b) => {
                const aIsMethod = [
                  "cohort study",
                  "systematic review",
                  "qualitative research",
                  "case report",
                  "survey",
                ].includes(a);
                const bIsMethod = [
                  "cohort study",
                  "systematic review",
                  "qualitative research",
                  "case report",
                  "survey",
                ].includes(b);
                if (aIsMethod && !bIsMethod) return -1;
                if (!aIsMethod && bIsMethod) return 1;
                return a.localeCompare(b);
              })
              .map((tag) => {
                const isMethodology = [
                  "cohort study",
                  "systematic review",
                  "qualitative research",
                  "case report",
                  "survey",
                ].includes(tag);
                return (
                  <span
                    key={tag}
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                      isMethodology
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        : "border bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {tag}
                  </span>
                );
              })}
          </div>
        )}

        {showDescription && study.description && (
          <StudyDescription description={study.description} />
        )}

        <div className="flex items-center border-t pt-3">
          <a
            href={study.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 no-underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <span className="line-clamp-1">{study.url}</span>
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span className="sr-only">(opens in new tab)</span>
          </a>
        </div>

        {isAdmin && !study.approved && (
          <div className="mt-1 rounded bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Pending approval
          </div>
        )}
      </div>

      {/* Right column — key findings (lg+ only split) */}
      {hasKeyPoints && (
        <div className="mt-4 w-full border-t pt-4 lg:mt-0 lg:w-1/2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <h3 className="!mt-0 !mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("keyFindings")}
          </h3>
          <ul className="!m-0 list-disc space-y-1.5 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {study.keyPoints!.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
