import { Study } from "@/app/types/study";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { CARD_SURFACE } from "../../ui/card";
import {
  getStudyDisplay,
  PendingBadge,
  StudyKeyPoints,
  StudyMeta,
  StudySourceLink,
  StudyTags,
} from "./parts";

export interface StudyCardProps {
  study: Study;
  isAdmin?: boolean;
  locale?: string;
  /** Hide the summary paragraph (e.g. compact chat citations) */
  showDescription?: boolean;
  /** Category the card is listed under (not repeated as a chip) */
  currentCategoryId?: number;
}

/** Study card (chat study citations). The /studies pages use StudyList rows. */
export function StudyCard({
  study,
  isAdmin,
  locale,
  showDescription = true,
  currentCategoryId,
}: StudyCardProps) {
  const t = useTranslations("studiesPage");
  const { detailHref, summary, isShortSummary, keyPoints, method, topics } =
    getStudyDisplay(study, locale, currentCategoryId);

  return (
    <article className={`flex h-full flex-col p-5 ${CARD_SURFACE}`}>
      <h3 className="text-base leading-snug font-semibold">
        <Link
          href={detailHref}
          className="decoration-1 underline-offset-4 hover:underline"
        >
          {study.headline || study.title}
        </Link>
      </h3>
      {study.title && study.title !== study.headline && (
        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm italic">
          {study.title}
        </p>
      )}
      <div className="mt-1">
        <StudyMeta study={study} />
      </div>

      {showDescription && summary && (
        <p
          className={`mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300 ${
            isShortSummary ? "" : "line-clamp-4"
          }`}
        >
          {summary}
        </p>
      )}

      {study.approved && keyPoints.length > 0 && (
        <div className="mt-4">
          <h4 className="text-muted-foreground mb-2 text-sm font-medium">
            {t("findings")}
          </h4>
          <StudyKeyPoints points={keyPoints} />
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <StudyTags method={method} topics={topics} locale={locale} />
        <StudySourceLink url={study.url} />
      </div>

      {isAdmin && !study.approved && (
        <div className="mt-3">
          <PendingBadge />
        </div>
      )}
    </article>
  );
}
