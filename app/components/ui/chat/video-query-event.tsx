"use client";

import { usePart } from "@llamaindex/chat-ui";
import { Loader2 } from "lucide-react";
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

export default function VideoQueryEventPart() {
  // usePart returns data only if current part matches the type
  const videoPart = usePart<EventPart>("data-video-query-event");

  // Memoize the parsed results to prevent unnecessary re-parsing
  const results = useMemo(() => {
    if (!videoPart?.data?.result) return [];
    try {
      const result = JSON.parse(videoPart.data.result);
      return result.map((item: any) => ({
        text: item.node.text,
        summary: item.node.metadata.sectionSummary,
        title: item.node.metadata.title,
        author: item.node.metadata.author,
        startTime: item.node.metadata.startTime,
        endTime: item.node.metadata.endTime,
        url: item.node.metadata.url,
        sex: item.node.metadata.sex,
        created: Number(item.node.metadata.created) * 1000, // unix time to ms
        link: item.node.metadata.link,
        id: item.node.metadata.id,
      }));
    } catch (error) {
      console.error("Error parsing video data:", error);
      return [];
    }
  }, [videoPart?.data?.result]);

  if (!videoPart) return null;

  return (
<div className="flex row"> {results}</div>
  );
}
