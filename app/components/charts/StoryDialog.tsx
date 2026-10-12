"use client";

import { ReadingDialog } from "@/app/components/ui/reading-dialog";
import { getStoryPath } from "@/app/lib/story-urls";
import { ArrowUpRight, Loader2, Triangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatUpvotes,
  pickLocalized,
  type Story,
  type StoryDetail,
} from "./story";

interface StoryDialogProps {
  story: Story | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full-story reading dialog for a spotlight card. Card data (name, sex, ages,
 * upvotes) comes in as props; the full narrative is fetched from
 * /api/stories/[id] on open and shown localized when a translation exists.
 */
export default function StoryDialog({
  story,
  open,
  onOpenChange,
}: StoryDialogProps) {
  const locale = useLocale();
  const t = useTranslations("statsPage.stories");
  const [detail, setDetail] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !story) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetch(`/api/stories/${story.id}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as StoryDetail;
      })
      .then((json) => {
        if (!cancelled) setDetail(json);
      })
      .catch((err: unknown) => {
        if (
          cancelled ||
          (err instanceof DOMException && err.name === "AbortError")
        )
          return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, story]);

  const outcomeLabel =
    story?.status === "desisted"
      ? t("ages.desistance")
      : t("ages.detransition");
  const ages = story
    ? [
        { label: t("ages.firstDysphoria"), age: story.ages.firstDysphoria },
        { label: t("ages.transition"), age: story.ages.transition },
        { label: outcomeLabel, age: story.ages.detransition },
      ].filter(
        (entry): entry is { label: string; age: number } => entry.age != null,
      )
    : [];

  const experience = pickLocalized(
    detail?.experienceTranslation ?? null,
    detail?.experience ?? null,
    locale,
  );

  return (
    <ReadingDialog
      open={open}
      onOpenChange={onOpenChange}
      title={story?.name || t("dialog.title")}
      meta={
        story && (
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {story.sex && (
              <span>{story.sex === "f" ? t("female") : t("male")}</span>
            )}
            {ages.length >= 2 && (
              <span title={t("agesCaption", { outcome: outcomeLabel })}>
                {ages.map((entry) => `${entry.label} ${entry.age}`).join(" → ")}
              </span>
            )}
            {story.upvotes !== 0 && (
              <span
                className="flex items-center gap-1 text-orange-500"
                title={t("upvotesLabel", {
                  count: formatUpvotes(story.upvotes, locale),
                })}
              >
                <Triangle aria-hidden className="h-2.5 w-2.5 fill-current" />
                {formatUpvotes(story.upvotes, locale)}
              </span>
            )}
          </div>
        )
      }
      share={
        story && {
          url: () =>
            `${window.location.origin}${getStoryPath(locale, story.slug)}`,
          title: story.name || t("dialog.title"),
        }
      }
      labels={{ close: t("dialog.close") }}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-muted-foreground px-4 py-6 text-sm">
          {t("dialog.error")}: {error}
        </p>
      ) : (
        <div className="h-full overflow-y-auto px-4 pt-2 pb-8 sm:px-6">
          {experience ? (
            <div className="dark:text-muted-foreground space-y-4 leading-relaxed whitespace-pre-line">
              {experience}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("dialog.error")}</p>
          )}
          {story && experience && (
            <Link
              href={getStoryPath(locale, story.slug)}
              className="text-primary mt-6 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              {t("dialog.openPage")}
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </ReadingDialog>
  );
}
