import { Study } from "@/app/types/study";
import { StudyDescription } from "./StudyDescription";

export interface StudyCardProps {
  study: Study;
}

export function StudyCard({ study }: StudyCardProps) {
  return (
    <article className="prose dark:prose-invert dark:bg-secondary block rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="!mt-0 !mb-2 text-base">
        {study.headline}
      </h2>

      <div className="!mt-0 !mb-1 flex items-start justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="line-clamp-1 flex-1 italic">{study.title}</span>
        <span className="shrink-0">({study.year})</span>
      </div>
      <p className="!mt-0 !mb-3 line-clamp-1 text-sm text-gray-600 dark:text-gray-400">
        <span>{study.authors}</span>
        {study.journal && (
          <>
            <span className="mx-2">•</span>
            <em>{study.journal}</em>
          </>
        )}
      </p>

      {study.description && (
        <StudyDescription description={study.description} url={study.url} />
      )}
    </article>
  );
}
