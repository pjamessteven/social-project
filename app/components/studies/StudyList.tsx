import {
  getStudyDisplay,
  PendingBadge,
  StudyKeyPoints,
  StudyMeta,
  StudySourceLink,
  StudyTags,
} from "@/app/components/content/StudyCard/parts";
import { Study } from "@/app/types/study";
import { useTranslations } from "next-intl";
import Link from "next/link";

/**
 * Compact study list for the /studies pages: one divided row per study with
 * the headline, meta, summary and tags on the left and the key findings in a
 * side column on wide screens (stacked below on narrow ones).
 */
export function StudyList({
  studies,
  locale,
  isAdmin,
  currentCategoryId,
}: {
  studies: Study[];
  locale: string;
  isAdmin?: boolean;
  /** Category being listed (not repeated as a chip on each row) */
  currentCategoryId?: number;
}) {
  return (
    <ul className="divide-y border-y">
      {studies.map((study) => (
        <StudyListItem
          key={study.id}
          study={study}
          locale={locale}
          isAdmin={isAdmin}
          currentCategoryId={currentCategoryId}
        />
      ))}
    </ul>
  );
}

function StudyListItem({
  study,
  locale,
  isAdmin,
  currentCategoryId,
}: {
  study: Study;
  locale: string;
  isAdmin?: boolean;
  currentCategoryId?: number;
}) {
  const t = useTranslations("studiesPage");
  const { detailHref, summary, isShortSummary, keyPoints, method, topics } =
    getStudyDisplay(study, locale, currentCategoryId);
  const showFindings = study.approved && keyPoints.length > 0;

  return (
    <li className="grid gap-x-10 gap-y-3 py-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0">
        <h3 className="text-lg leading-snug font-semibold">
          <Link
            href={detailHref}
            className="decoration-1 underline-offset-4 hover:underline"
          >
            {study.headline || study.title}
          </Link>
        </h3>
        {study.title && study.title !== study.headline && (
          <p className="text-muted-foreground mt-1 line-clamp-1 text-sm italic">
            {study.title}
          </p>
        )}
        <div className="mt-0.5">
          <StudyMeta study={study} />
        </div>
        {summary && (
          <p
            className={`mt-3 text-base leading-relaxed text-gray-700 dark:text-gray-300 ${
              isShortSummary ? "" : "line-clamp-3"
            }`}
          >
            {summary}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StudyTags method={method} topics={topics} locale={locale} />
          <StudySourceLink url={study.url} />
        </div>
        {isAdmin && !study.approved && (
          <div className="mt-3 w-fit">
            <PendingBadge />
          </div>
        )}
      </div>

      {showFindings && (
        <div className="min-w-0 lg:border-l lg:pl-8">
          <h4 className="text-muted-foreground mb-2 text-sm font-medium">
            {t("findings")}
          </h4>
          <StudyKeyPoints points={keyPoints} />
        </div>
      )}
    </li>
  );
}
