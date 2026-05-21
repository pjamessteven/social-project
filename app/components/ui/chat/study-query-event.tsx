"use client";

import { Study } from "@/app/types/study";
import { usePart } from "@llamaindex/chat-ui";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { StudyCard } from "../../content/StudyCard";
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

export default function StudyQueryEventPart() {
  const eventPart = usePart<EventPart>("data-study-query-event");
  const t = useTranslations("chat");

  const results = useMemo(() => {
    if (!eventPart?.data?.result) return [];
    try {
      const parsed: StudyResultItem[] = JSON.parse(eventPart.data.result);
      // Deduplicate by studyId
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
    } catch (error) {
      console.error("Error parsing study event data:", error);
      return [];
    }
  }, [eventPart?.data?.result]);

  if (!eventPart) return null;

  const isLoading = eventPart.data.title === "Querying studies...";
  const isError = eventPart.data.status === "error";

  return (
    <Accordion
      type="single"
      collapsible
      className="study-query not-prose -mt-2 w-full"
    >
      <AccordionItem
        value="disclaimer"
        className="text-muted-foreground overflow-hidden border-none"
      >
        <AccordionTrigger
          disabled={isLoading}
          indicatorStart
          className="text-muted-foreground bg-secondary rounded-xl p-3 hover:no-underline sm:p-3"
        >
          <div className="flex w-full flex-row items-center justify-between">
            <div className="no-wrap flex flex-row items-baseline pr-2">
              <div className="text-muted-foreground text-base font-normal italic">
                Query Studies:{" "}
                {eventPart?.data?.query
                  ? eventPart?.data?.query
                  : t("lookingForStudies")}
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
            {results.map((study, index) => (
              <StudyCard study={study} key={index} showDescription={false} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
