"use client";

import { Button } from "@/app/components/ui/button";
import { getStoryPath } from "@/app/lib/story-urls";
import { Loader2, Triangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CARD_LOADING_SURFACE, CARD_SURFACE } from "./ChartParts";
import StoryDialog from "./StoryDialog";
import { formatUpvotes, type Story } from "./story";
import { buildFeatureParams, prettifyKey } from "./useFeatureData";
import { useFeatureLabels } from "./useFeatureLabels";

interface SpotlightResponse {
  cohort: number;
  total: number;
  /** Stories under the default filters; null on later pages. */
  allTotal: number | null;
  hasMore: boolean;
  stories: Story[];
}

const PAGE_SIZE = 9;

// Column breakpoints, matching Tailwind's `sm` and `xl`.
const COLUMN_QUERIES = [
  { query: "(min-width: 1280px)", columns: 3 },
  { query: "(min-width: 640px)", columns: 2 },
];

/** Number of masonry columns for the current viewport. */
function useColumnCount() {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const mqls = COLUMN_QUERIES.map(({ query, columns }) => ({
      mql: window.matchMedia(query),
      columns,
    }));
    const update = () =>
      setColumns(mqls.find(({ mql }) => mql.matches)?.columns ?? 1);
    update();
    mqls.forEach(({ mql }) => mql.addEventListener("change", update));
    return () =>
      mqls.forEach(({ mql }) => mql.removeEventListener("change", update));
  }, []);

  return columns;
}

/** Nearest scrolling ancestor, or null (the viewport) if there is none. */
function getScrollParent(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(el).overflowY)) return el;
  }
  return null;
}

// Skeleton card heights, so the loading state reads as uneven columns.
const SKELETON_HEIGHTS = ["h-56", "h-72", "h-64", "h-80", "h-60", "h-52"];

/**
 * Anonymous story excerpts with feature chips. Cards open the full story in
 * a reading dialog; the list loads more stories as you scroll.
 */
export default function StoriesSection() {
  const t = useTranslations("statsPage.stories");
  const locale = useLocale();
  const labels = useFeatureLabels();
  const searchParams = useSearchParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Story | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const columns = useColumnCount();
  const params = buildFeatureParams(searchParams);
  const hasMore = stories.length < total;

  // First page (and full reset on filter change).
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStories([]);
    fetch(`/api/stories/spotlight?count=${PAGE_SIZE}&offset=0&${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as SpotlightResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setStories(json.stories);
        setTotal(json.total);
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
  }, [params]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/stories/spotlight?count=${PAGE_SIZE}&offset=${stories.length}&${params}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = (await response.json()) as SpotlightResponse;
      setStories((previous) => {
        const seen = new Set(previous.map((story) => story.id));
        return [
          ...previous,
          ...json.stories.filter((story) => !seen.has(story.id)),
        ];
      });
      setTotal(json.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, params, stories.length]);

  // Infinite scrolling: fetch the next page when the sentinel nears the
  // bottom of the scroll container. Columns end at different heights, so the
  // shortest one runs out well before the sentinel (below the tallest) is
  // reached — load early. The page scrolls inside <main>, not the window, so
  // observe against that container or the margin is clipped away.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root: getScrollParent(node), rootMargin: "0px 0px 1200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const openStory = (story: Story) => {
    setSelected(story);
    setDialogOpen(true);
  };

  const renderCard = (story: Story) => {
    const desisted = story.status === "desisted";
    const outcomeLabel = desisted
      ? t("ages.desistance")
      : t("ages.detransition");
    const ages = [
      {
        label: t("ages.firstDysphoria"),
        age: story.ages.firstDysphoria,
      },
      {
        // Desisters had no medical intervention, so any transition
        // they describe was social only.
        label: desisted ? t("ages.socialTransition") : t("ages.transition"),
        age: story.ages.transition,
      },
      { label: outcomeLabel, age: story.ages.detransition },
    ].filter(
      (entry): entry is { label: string; age: number } => entry.age != null,
    );
    const meta = [
      story.sex === "f" ? t("female") : story.sex === "m" ? t("male") : null,
      story.status ? t(`status.${story.status}`) : null,
    ].filter(Boolean);
    return (
      <article
        key={story.id}
        onClick={() => openStory(story)}
        className={`flex cursor-pointer flex-col p-4 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${CARD_SURFACE}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base leading-snug font-medium">
            {/* A real link to the canonical story page (crawlable,
                opens in a new tab with modifier keys); a plain click
                opens the reading dialog instead. */}
            <Link
              href={getStoryPath(locale, story.slug)}
              prefetch={false}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  event.stopPropagation();
                  return;
                }
                event.preventDefault();
              }}
              className="hover:underline"
            >
              {story.name || t("dialog.title")}
            </Link>
          </h3>
          {story.upvotes !== 0 && (
            <span
              className="flex shrink-0 items-center gap-1 pt-0.5 text-xs font-medium text-orange-500"
              title={t("upvotesLabel", {
                count: formatUpvotes(story.upvotes, locale),
              })}
            >
              <Triangle aria-hidden className="h-2.5 w-2.5 fill-current" />
              {formatUpvotes(story.upvotes, locale)}
            </span>
          )}
        </div>
        {meta.length > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">
            {meta.join(" · ")}
          </p>
        )}
        {ages.length >= 2 && (
          <p
            className="text-muted-foreground mt-0.5 text-xs"
            title={t("agesCaption", { outcome: outcomeLabel })}
          >
            {ages.map((entry) => `${entry.label} ${entry.age}`).join(" → ")}
          </p>
        )}
        <p className="dark:text-muted-foreground mt-3 text-sm leading-relaxed">
          {story.excerpt}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {story.chips.map((chip) => {
            const label = labels.feature(chip.key, prettifyKey(chip.key));
            return (
              <span
                key={chip.key}
                className="rounded-full border bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                {label}
              </span>
            );
          })}
        </div>
      </article>
    );
  };

  if (error && stories.length === 0 && !loading) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("error")}: {error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {loading && stories.length === 0 && (
        <div className="flex items-start gap-3">
          {Array.from({ length: columns }, (_, column) => (
            <div key={column} className="flex min-w-0 flex-1 flex-col gap-3">
              {SKELETON_HEIGHTS.filter(
                (_, index) => index % columns === column,
              ).map((height, index) => (
                <div
                  key={index}
                  className={`${height} ${CARD_LOADING_SURFACE}`}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && stories.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}

      {stories.length > 0 && (
        <div className="flex items-start gap-3">
          {Array.from({ length: columns }, (_, column) => (
            <div key={column} className="flex min-w-0 flex-1 flex-col gap-3">
              {stories
                .filter((_, index) => index % columns === column)
                .map(renderCard)}
            </div>
          ))}
        </div>
      )}

      {error && stories.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {t("error")}: {error}
        </p>
      )}

      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full px-4"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            {loadingMore ? t("loading") : t("loadMore")}
          </Button>
        </div>
      ) : (
        stories.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {t("basedOn", { cohort: total })}
          </p>
        )
      )}

      <StoryDialog
        story={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
