"use client";

import { capitaliseFirstWord, cn } from "@/app/lib/utils";
import { Study } from "@/app/types/study";
import { useChatStore } from "@/stores/chat-store";
import { useChatMessage, useChatUI, usePart } from "@llamaindex/chat-ui";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useMemo, useState } from "react";
import YouTube from "react-youtube";
import CommentCard from "../../../CommentCard";
import ChatBubbleButton from "../../../content/ChatBubbleButton";
import { StudyCard } from "../../../content/StudyCard/StudyCard";
import { EventWrapper, type EventPartData } from "./EventWrapper";

function useLocale() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] || "en";
}

// =====================
// Shared helpers
// =====================

function parseResult(result: any): any {
  if (!result) return null;
  try {
    return typeof result === "string" ? JSON.parse(result) : result;
  } catch {
    return null;
  }
}

// =====================
// Comment Query
// =====================

export function CommentQueryEventPart() {
  const eventPart = usePart<EventPartData>("data-comment-query-event");
  const t = useTranslations("chat");

  const results = useMemo(() => {
    if (!eventPart?.data?.result) return [];
    try {
      const result = JSON.parse(eventPart.data.result);
      return result.map((item: any) => ({
        text: item.node.text,
        summary: item.node.metadata.sectionSummary,
        score: item.node.metadata.score,
        created: Number(item.node.metadata.created) * 1000,
        link: item.node.metadata.link,
        id: item.node.metadata.id,
        subreddit: "/r/detrans",
      }));
    } catch {
      return [];
    }
  }, [eventPart?.data?.result]);

  if (!eventPart) return null;

  return (
    <EventWrapper
      eventType="data-comment-query-event"
      label={t("eventLabels.askDetransitioners")}
      query={eventPart.data.query}
      analysingText={t("analysingExperiences")}
    >
      <div className="text-primary mt-4 max-w-full space-y-4">
        {eventPart.data.status === "error" && (
          <span>{t("eventErrors.errorOccurred")}</span>
        )}
        {results.map((comment: any, index: number) => (
          <CommentCard key={index} comment={comment} />
        ))}
      </div>
    </EventWrapper>
  );
}

// =====================
// Video Query (expanded by default)
// =====================

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formatted = new Intl.NumberFormat(undefined, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(remainingSeconds);
  return `${minutes}:${formatted}`;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const VideoComponent = memo(function VideoComponent({
  video,
  isFirst,
}: {
  video: any;
  isFirst: boolean;
}) {
  const videoId = extractYouTubeVideoId(video.url);
  const t = useTranslations("chat");
  return (
    <div className="not-prose mb-2 rounded-lg border">
      {videoId ? (
        <YouTube
          videoId={videoId}
          opts={{
            height: "270",
            width: "480",
            playerVars: {
              autoplay: isFirst ? 1 : 0,
              mute: isFirst ? 1 : 0,
              start: Math.floor(video.startTime),
            },
          }}
        />
      ) : (
        <div className="p-4 text-center text-gray-500">
          {t("eventErrors.invalidYoutubeUrl")}
        </div>
      )}
      {video.summary && (
        <div className="p-3">
          <p className="text-sm text-gray-600">
            [{formatSeconds(video.startTime)}] {video.summary}
          </p>
        </div>
      )}
    </div>
  );
});

export function VideoQueryEventPart() {
  const eventPart = usePart<EventPartData>("data-video-query-event");
  const t = useTranslations("chat");

  const results = useMemo(() => {
    if (!eventPart?.data?.result) return [];
    try {
      const result = JSON.parse(eventPart.data.result);
      return result.map((item: any) => ({
        text: item.node.text,
        summary: item.node.metadata.sectionSummary,
        title: item.node.metadata.title,
        author: item.node.metadata.author,
        startTime: item.node.metadata.startTime,
        endTime: item.node.metadata.endTime,
        url: item.node.metadata.url,
        sex: item.node.metadata.sex,
        created: Number(item.node.metadata.created) * 1000,
        link: item.node.metadata.link,
        id: item.node.metadata.id,
      }));
    } catch {
      return [];
    }
  }, [eventPart?.data?.result]);

  if (!eventPart) return null;

  return (
    <EventWrapper
      eventType="data-video-query-event"
      label={t("eventLabels.videoArchive")}
      query={eventPart.data.query}
      defaultExpanded
      analysingText={t("eventStatus.analysingVideos")}
    >
      <div className="mt-4 max-w-[calc(100vw-16px)] sm:max-w-[614px]">
        {results.length > 0 ? (
          <div className="flex flex-row gap-4 overflow-x-auto">
            {results.map((video: any, index: number) => (
              <VideoComponent
                key={video.id || index}
                video={video}
                isFirst={index === 0}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            {t("eventEmptyStates.noVideosFound")}
          </p>
        )}
        {"->"} {t("eventButtons.seeMoreOnVideosPage")}{" "}
        <Link prefetch={false} href="/videos" className="underline">
          {t("eventButtons.videosPage")}
        </Link>
      </div>
    </EventWrapper>
  );
}

// =====================
// Study Query
// =====================

interface StudyResultItem {
  studyId: number;
  title: string;
  authors: string;
  year: number;
  url: string;
  abstract: string;
  conclusion: string;
  keyPoints: string[];
  chunks: string[];
}

export function StudyQueryEventPart() {
  const eventPart = usePart<EventPartData>("data-study-query-event");
  const t = useTranslations("chat");

  const results = useMemo(() => {
    if (!eventPart?.data?.result) return [];
    try {
      const parsed: StudyResultItem[] = JSON.parse(eventPart.data.result);
      const seen = new Set<number>();
      const unique: StudyResultItem[] = [];
      for (const item of parsed) {
        if (seen.has(item.studyId)) continue;
        seen.add(item.studyId);
        unique.push(item);
      }
      return unique.map((item) => ({
        id: item.studyId,
        headline: item.title,
        title: item.title,
        authors: item.authors,
        year: item.year,
        url: item.url,
        displayUrl: item.url,
        journal: "",
        description: item.abstract,
        approved: true,
        abstract: item.abstract,
        conclusion: item.conclusion,
        keyPoints: item.keyPoints,
        summary: "",
      })) as Study[];
    } catch {
      return [];
    }
  }, [eventPart?.data?.result]);

  if (!eventPart) return null;

  return (
    <EventWrapper
      eventType="data-study-query-event"
      label={t("eventLabels.queryStudies")}
      query={eventPart.data.query}
      analysingText={t("analysingStudies")}
    >
      <div className="text-primary mt-4 max-w-full space-y-4">
        {eventPart.data.status === "error" && (
          <span>{t("eventErrors.errorOccurred")}</span>
        )}
        {results.map((study, index) => (
          <StudyCard study={study} key={index} showDescription={false} />
        ))}
      </div>
    </EventWrapper>
  );
}

// =====================
// Web Search
// =====================

export function WebSearchEventPart() {
  const eventPart = usePart<EventPartData>("data-web-search-event");
  const query = eventPart?.data?.query || null;
  const t = useTranslations("chat");

  const results = useMemo(() => {
    if (!eventPart?.data?.result) return null;
    try {
      const result =
        typeof eventPart.data.result === "string"
          ? JSON.parse(eventPart.data.result)
          : eventPart.data.result;
      return result?.results ?? null;
    } catch {
      return null;
    }
  }, [eventPart?.data?.result]);

  if (!eventPart) return null;

  const isSuccess = eventPart.data.status === "success";
  const isEmpty = isSuccess && Array.isArray(results) && results.length === 0;

  return (
    <EventWrapper
      eventType="data-web-search-event"
      label={t("eventLabels.webSearch")}
      query={query || undefined}
      analysingText={t("analysingWebResults")}
    >
      <div className="not-prose my-2 w-full">
        {isSuccess && Array.isArray(results) && results.length > 0 && (
          <div className="bg-muted/50 mt-1 space-y-1 rounded-2xl border px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              {results.length}{" "}
              {results.length === 1
                ? t("eventCounts.source")
                : t("eventCounts.sources")}
              :
            </span>
            <ul className="mt-1 space-y-1.5">
              {results.map((r: any, i: number) => (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.title}
                  </a>
                  {r.hostname && (
                    <span className="text-muted-foreground ml-1.5">
                      ({r.hostname})
                    </span>
                  )}
                  {r.snippets && r.snippets.length > 0 && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-3">
                      {r.snippets[0]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isEmpty && (
          <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-center gap-1 font-medium">
              <AlertCircle className="h-3 w-3" />
              {t("eventEmptyStates.noResultsFound")}
            </div>
          </div>
        )}

        {eventPart.data.status === "error" && (
          <div className="mt-1 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
            <div className="flex items-center gap-1 font-medium">
              <AlertCircle className="h-3 w-3" />
              {t("eventErrors.webSearchFailed")}
            </div>
          </div>
        )}
      </div>
    </EventWrapper>
  );
}

// =====================
// Wiki: Studies (with inline expand)
// =====================

export function GetStudiesEventPart() {
  const eventPart = usePart<EventPartData>("data-get-studies-event");
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("chat");

  const parsed = useMemo(
    () => parseResult(eventPart?.data?.result),
    [eventPart?.data?.result],
  );

  if (!eventPart) return null;

  const isSuccess = eventPart.data.status === "success";
  const studies = parsed?.studies ?? [];
  const isEmpty = isSuccess && studies.length === 0;

  return (
    <EventWrapper
      eventType="data-get-studies-event"
      label={t("eventLabels.queryStudyCatalogue")}
      query={
        isSuccess &&
        studies.length &&
        `${studies.length} ${t("eventCounts.results")}`
      }
      analysingText={t("analysingStudies")}
      disableExpand
    >
      <div className="not-prose my-2 w-full">
        {isSuccess && studies.length > 0 && (
          <div
            className="bg-muted/50 mt-1 space-y-1 rounded border px-3 py-2 text-xs"
            onClick={() => setExpanded(!expanded)}
            style={{ cursor: "pointer" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground"></span>
              <span className="text-muted-foreground text-xs">
                {expanded ? "▲" : "▼"}
              </span>
            </div>
            {expanded && (
              <ul className="mt-2 space-y-2">
                {studies.map((s: any) => (
                  <li
                    key={s.id}
                    className="border-border border-b pb-1.5 last:border-0 last:pb-0"
                  >
                    <div className="font-medium">{s.title}</div>
                    <div className="text-muted-foreground mt-0.5">
                      {s.authors && <span>{s.authors}</span>}
                      {s.year && <span> ({s.year})</span>}
                      {s.journal && <span> — {s.journal}</span>}
                    </div>
                    {s.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2">
                        {s.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isEmpty && (
          <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-center gap-1 font-medium">
              <AlertCircle className="h-3 w-3" />
              {t("eventEmptyStates.noResultsFound")}
            </div>
          </div>
        )}

        {eventPart.data.status === "error" && (
          <div className="mt-1 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
            <div className="flex items-center gap-1 font-medium">
              <AlertCircle className="h-3 w-3" />
              {t("eventErrors.failedToFetchStudies")}
            </div>
          </div>
        )}
      </div>
    </EventWrapper>
  );
}

// =====================
// Follow-Up Questions
// =====================

export function QuestionsEventPart() {
  const eventPart = usePart<EventPartData>("data-questions-event");
  const t = useTranslations("chat");
  const { sendMessage } = useChatStore();
  const { message } = useChatMessage();
  const { messages } = useChatUI();

  const isLast = messages[messages.length - 1]?.id === message.id;

  const questions: string[] = useMemo(() => {
    if (!eventPart?.data?.result) return [];
    try {
      const result =
        typeof eventPart.data.result === "string"
          ? JSON.parse(eventPart.data.result)
          : eventPart.data.result;
      return result.questions || [];
    } catch {
      return [];
    }
  }, [eventPart?.data?.result]);

  if (!eventPart) return null;

  return (
    <div
      className={cn(
        "-mt-2 mb-2 flex flex-col items-end gap-2 sm:-mr-16",
        !isLast && "pointer-events-none opacity-50",
      )}
    >
      {questions.map((question, index) => (
        <ChatBubbleButton
          key={index}
          message={{ display: capitaliseFirstWord(question) }}
          onClick={() => sendMessage(question)}
        />
      ))}
    </div>
  );
}
