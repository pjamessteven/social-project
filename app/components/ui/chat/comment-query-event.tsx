"use client";

import { useChatUI, usePart } from "@llamaindex/chat-ui";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import CommentCard from "../../CommentCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";

type EventPart = {
  id?: string | undefined;
  type: "data-event";
  data: {
    title: string;
    query: string;
    result: any;
    status: string;
  };
};

export default function CommentQueryEventPart() {
  // usePart returns data only if current part matches the type
  const commentPart = usePart<EventPart>("data-comment-query-event");
  const t = useTranslations("chat");

  const { isLoading: loadingGlobal, status, messages } = useChatUI();

  const isThinking = useMemo(() => {
    const latestResponse = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    const lastPart: any =
      latestResponse?.parts?.[latestResponse.parts.length - 1];
    const secondLastPart =
      latestResponse?.parts?.[latestResponse.parts.length - 2];
    if (!commentPart || !lastPart) {
      return false;
    }
    if (
      lastPart.id === commentPart.id ||
      (secondLastPart === commentPart.id && lastPart.text === "")
    ) {
      return true;
    }
  }, [messages, commentPart]);

  // Memoize the parsed results to prevent unnecessary re-parsing
  const results = useMemo(() => {
    if (!commentPart?.data?.result) return [];
    try {
      const result = JSON.parse(commentPart.data.result);
      return result.map((item: any) => ({
        text: item.node.text,
        summary: item.node.metadata.sectionSummary,
        score: item.node.metadata.score,
        created: Number(item.node.metadata.created) * 1000, // unix time to ms
        link: item.node.metadata.link,
        id: item.node.metadata.id,
        subreddit: "/r/detrans",
      }));
    } catch (error) {
      console.error("Error parsing event data:", error);
      return [];
    }
  }, [commentPart?.data?.result]);

  if (!commentPart) return null;

  const isLoading = commentPart.data.title === "Querying user comments...";
  const isError = commentPart.data.status === "error";
  return (
    <>
      <Accordion
        type="single"
        collapsible
        className="comment-query not-prose -mt-2 w-full"
      >
        <AccordionItem
          value="disclaimer"
          className="text-muted-foreground overflow-hidden border-none"
        >
          <AccordionTrigger
            disabled={isLoading}
            indicatorStart
            className="text-muted-foreground bg-secondary rounded-lg border p-3 hover:no-underline sm:p-3"
          >
            <div className="flex w-full flex-row items-center justify-between">
              <div className="no-wrap flex flex-row items-baseline pr-2">
                <div className="text-muted-foreground text-base font-normal italic">
                  {commentPart?.data?.query
                    ? commentPart?.data?.query
                    : t("lookingForComments")}
                </div>
              </div>
              {isLoading && (
                <Loader2 className="mr-2 ml-2 h-4 min-w-4 animate-spin text-blue-500" />
              )}
              {!isLoading && !isError && (
                <CheckCircle2 className="mr-2 ml-2 h-4 min-w-4 text-green-500" />
              )}
              {isError && (
                <AlertCircle className="mr-2 ml-2 h-4 min-w-4 text-red-500" />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex max-w-full flex-col pb-3">
            <div className="text-primary mt-4 max-w-full space-y-4">
              {isError && t("errorOccurred")}
              {results.map((comment: any, index: number) => (
                <CommentCard key={index} comment={comment as any} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {isThinking && !isError && !isLoading && (
        <div className="flex w-full items-center justify-start pb-2">
          <span>{t("analysingExperiences")}</span>
          <Loader2 className="ml-2 h-4 w-4 animate-spin text-black dark:text-white" />
        </div>
      )}
    </>
  );
}
