"use client";

import { ReadingDialog } from "@/app/components/ui/reading-dialog";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CARD_LOADING_SURFACE } from "./ChartParts";
import StoryDialog from "./StoryDialog";
import type { Story } from "./story";
import { buildFeatureParams } from "./useFeatureData";

const PEEK_COUNT = 3;

type OpenStories = (featureKey: string, label: string) => void;

const FeatureStoriesContext = createContext<OpenStories | null>(null);

/**
 * Returns a callback that opens example stories for a yes/no feature, or
 * null outside the stats page (rows then render as plain, unclickable rows).
 */
export function useFeatureStories(): OpenStories | null {
  return useContext(FeatureStoriesContext);
}

/**
 * Lets any chart row on /stats open three anonymous stories that match the
 * feature, respecting the active filters. Seeing real accounts behind a bar
 * is the quickest way to judge whether a model-derived number holds up.
 */
export function FeatureStoriesProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("statsPage.storyPeek");
  const searchParams = useSearchParams();
  const params = buildFeatureParams(searchParams);
  const [target, setTarget] = useState<{ key: string; label: string } | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reading, setReading] = useState<Story | null>(null);
  const [readingOpen, setReadingOpen] = useState(false);

  const openStories = useCallback<OpenStories>((featureKey, label) => {
    setTarget({ key: featureKey, label });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open || !target) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setStories([]);
    fetch(
      `/api/stories/spotlight?feature=${encodeURIComponent(target.key)}&count=${PEEK_COUNT}&offset=0&${params}`,
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
  }, [open, target, params]);

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
