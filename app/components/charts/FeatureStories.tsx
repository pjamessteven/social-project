"use client";

import { ReadingDialog } from "@/app/components/ui/reading-dialog";
import { useLocale, useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CARD_LOADING_SURFACE } from "./ChartParts";
import StoryDialog from "./StoryDialog";
import type { Story } from "./story";
import { useFeatureQuery } from "./useFeatureData";

const PEEK_COUNT = 3;

type OpenStories = (featureKey: string, label: string) => void;
type OpenStoriesWithQuery = (
  featureKey: string,
  label: string,
  query: string,
) => void;

const FeatureStoriesContext = createContext<OpenStoriesWithQuery | null>(null);

/**
 * Returns a callback that opens example stories for a yes/no feature, or
 * null outside the stats page (rows then render as plain, unclickable rows).
 */
export function useFeatureStories(): OpenStories | null {
  const open = useContext(FeatureStoriesContext);
  // The caller's filters (page + its section's filter bar), so the stories
  // match the numbers in the chart that opened them.
  const query = useFeatureQuery();
  return useMemo(
    () =>
      open
        ? (featureKey: string, label: string) => open(featureKey, label, query)
        : null,
    [open, query],
  );
}

/**
 * Lets any chart row on /stats open three anonymous stories that match the
 * feature, respecting the active filters. Seeing real accounts behind a bar
 * is the quickest way to judge whether a model-derived number holds up.
 */
export function FeatureStoriesProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("statsPage.storyPeek");
  const locale = useLocale();
  const [target, setTarget] = useState<{
    key: string;
    label: string;
    query: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reading, setReading] = useState<Story | null>(null);
  const [readingOpen, setReadingOpen] = useState(false);

  const openStories = useCallback<OpenStoriesWithQuery>(
    (featureKey, label, query) => {
      setTarget({ key: featureKey, label, query });
      setOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!open || !target) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setStories([]);
    fetch(
      `/api/stories/spotlight?feature=${encodeURIComponent(target.key)}&count=${PEEK_COUNT}&offset=0&locale=${locale}&${target.query}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { total: number; stories: Story[] };
      })
      .then((json) => {
        setStories(json.stories);
        setTotal(json.total);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, target, locale]);

  return (
    <FeatureStoriesContext.Provider value={openStories}>
      {children}
      <ReadingDialog
        open={open}
        onOpenChange={setOpen}
        title={target ? t("title", { label: target.label }) : ""}
        meta={!loading && total > 0 ? t("meta", { count: total }) : undefined}
      >
        <div className="space-y-6 pb-4">
          {loading &&
            Array.from({ length: PEEK_COUNT }).map((_, index) => (
              <div key={index} className={`h-28 ${CARD_LOADING_SURFACE}`} />
            ))}
          {!loading && error && (
            <p className="text-muted-foreground text-base">{t("error")}</p>
          )}
          {!loading && !error && stories.length === 0 && (
            <p className="text-muted-foreground text-base">{t("empty")}</p>
          )}
          {stories.map((story) => (
            <article key={story.id} className="border-b pb-6 last:border-b-0">
              <p className="text-base leading-relaxed">{story.excerpt}</p>
              <button
                type="button"
                onClick={() => {
                  setReading(story);
                  setReadingOpen(true);
                }}
                className="text-primary mt-2 text-base font-medium hover:underline"
              >
                {t("readFull")}
              </button>
            </article>
          ))}
          <p className="text-muted-foreground text-sm">{t("note")}</p>
        </div>
      </ReadingDialog>
      <StoryDialog
        story={reading}
        open={readingOpen}
        onOpenChange={setReadingOpen}
      />
    </FeatureStoriesContext.Provider>
  );
}
