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
 * Compact study list for the /studies pages: one card per study with the
 * headline, meta, summary and tags on the left and the key findings in a side
 * column on wide screens (stacked below on narrow ones). The cards match the
 * /topics index cards (the site's CARD_SURFACE, a little darker in dark mode
 * for readability); the classes are written out because this is a server
 * component and CARD_SURFACE lives in a client module.
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
    <ul className="space-y-4 sm:space-y-6">
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
    // The whole card opens the study: the title link's ::after stretches over
    // the card, and the tag/source links sit above it (relative z-10).
    <li className="dark:bg-secondary/50 hover:border-foreground/25 relative grid gap-x-10 gap-y-3 rounded-2xl border bg-white p-5 shadow-sm transition-[border-color,box-shadow] hover:shadow-md sm:p-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:p-8">
      <div className="min-w-0">
        <h3 className="text-lg leading-snug font-semibold">
          <Link
            href={detailHref}
            className="after:absolute after:inset-0 after:rounded-2xl after:content-['']"
          >
            {study.headline || study.title}
          </Link>
        </h3>
        {/* The original title and authors, set apart from the headline. */}
        <div className="mt-2.5">
          {study.title && study.title !== study.headline && (
            <p className="text-muted-foreground line-clamp-1 text-sm italic">
              {study.title}
            </p>
          )}
          <div className="mt-0.5">
            <StudyMeta study={study} />
          </div>
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
        <div className="relative z-10 mt-3 flex w-fit flex-wrap items-center gap-x-3 gap-y-2">
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
