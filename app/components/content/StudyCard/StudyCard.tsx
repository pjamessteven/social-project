import { Study } from "@/app/types/study";
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
  const detailHref = locale
    ? `/${locale}/studies/${study.id}`
    : `/studies/${study.id}`;

  return (
    <article className="prose dark:prose-invert dark:bg-secondary block rounded-xl border bg-white p-4">
      <div className="mb-2">
        <h2 className="!mt-0 !mb-0 text-base">
          <Link href={detailHref} className="no-underline hover:underline">
            {study.headline}
          </Link>
        </h2>
      </div>

      <div className="!mt-0 !mb-1 flex items-start justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="line-clamp-1 flex-1 italic">{study.title}</span>
        <span className="shrink-0">({study.year})</span>
      </div>
      <p className="!mt-2 !mb-3 line-clamp-1 text-sm text-gray-600 dark:text-gray-400">
        <span>{study.authors}</span>
        {study.journal && (
          <>
            &nbsp; (<em>{study.journal}</em>)
          </>
        )}
      </p>

      {/* Tags */}
      {study.tags && study.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t py-3">
          {study.tags.map((tag) => (
            <span
              key={tag}
              className="font- inline-flex items-center rounded-full border bg-gray-100 px-2 py-1 text-sm text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {showDescription && study.description && (
        <StudyDescription description={study.description} />
      )}

      <div className="flex items-center border-t pt-2">
        <a
          href={study.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 no-underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <span>{study.url}</span>
          <svg
            className="h-4 w-4"
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

      {study.approved && study.keyPoints && study.keyPoints.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <h3 className="!mt-0 !mb-2 text-sm font-semibold">Key Findings:</h3>
          <ul className="!mt-0 !mb-0 list-disc pl-5 text-sm">
            {study.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && !study.approved && (
        <div className="mt-2 rounded bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Pending approval
        </div>
      )}
    </article>
  );
}
