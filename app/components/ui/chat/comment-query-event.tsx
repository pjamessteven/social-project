"use client";

import { usePart } from "@llamaindex/chat-ui";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
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

  const isLoading = commentPart.data.title === "Querying user comments" ;
  const isError = commentPart.data.status === 'error'
  return (
    
    <Accordion
      type="single"
      collapsible
      className="comment-query not-prose  -mt-8  w-full"
    >
      <AccordionItem
        value="disclaimer"
        className="text-muted-foreground overflow-hidden border-b"
      >
        <AccordionTrigger
          hideIndicator={isLoading}
          indicatorStart
          className="text-muted-foreground pt-0 hover:no-underline !py-3"
        >
          <div className="flex flex-row items-center justify-between">
            <div className="no-wrap flex flex-row items-baseline justify-between pr-2">
              <div className="text-base font-normal italic">
                {commentPart?.data?.query
                  ? commentPart?.data?.query
                  : "Looking for relevant comments..."}
              </div>
            </div>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 min-w-4 animate-spin text-blue-500 dark:text-blue-100" />
            ) : isError ?  (<AlertCircle className="ml-2 mr-2 h-4 min-w-4 text-red-500" />) :  (
              <CheckCircle className="ml-2  mr-2 h-4 min-w-4 text-green-500" />
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="flex max-w-full flex-col pb-3">
          <div className="text-primary mt-4 space-y-4">
            {isError && 'Error occurred, try again... Contact me if this keeps happening.'}
            {results.map((comment: any, index: number) => (
              <CommentCard key={index} comment={comment as any} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

  );
}
