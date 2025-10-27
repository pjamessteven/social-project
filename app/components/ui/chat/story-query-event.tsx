"use client";

import { ChatMessage } from "@llamaindex/chat-ui";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";

import { usePart } from "@llamaindex/chat-ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";
import Link from "next/link";

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

interface User {
  username: string;
  sex: "m" | "f";
  tags: string[];
  transitionAge: number | null;
  detransitionAge: number | null;
}


export default function StoryQueryEventPart() {
  // usePart returns data only if current part matches the type
  const eventPart = usePart<EventPart>("data-story-query-event");

  if (!eventPart) return null;

  const results: { 
    user: User; 
    story: string; 
  }[] = JSON.parse(eventPart.data.result);

  return (
    <Accordion type="single" collapsible className="mt- mt-4 mb-4 w-full">
      <AccordionItem value="disclaimer" className="overflow-hidden border-none">
        <AccordionTrigger
          indicatorStart
          className="prose dark:prose-invert py-3 text-base !font-normal italic opacity-60 hover:no-underline"
        >
          {eventPart.data.title}
        </AccordionTrigger>
        <AccordionContent className="prose dark:prose-invert max-w-full pb-3 text-base">
          {results?.map(({user, story}, index: number) => (
            <p key={index}>
                            <Link

                href={`/stories/${encodeURIComponent(user.username)}`}
                className="block transition-colors sm:rounded-lg sm:border sm:p-6 sm:pt-6 sm:hover:bg-gray-50 sm:dark:hover:bg-gray-800/80"
              >
                <div className="flex w-full grow flex-row items-center justify-between">
                  <div className="mb-2 flex grow flex-col items-start justify-between sm:flex-row">
                    <h3 className="text-lg font-semibold">
                      /u/{user.username}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {user.commentCount} comments • Posting since{" "}
                        {formatDate(user.activeSince)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mb-3 h-6 sm:hidden" />
                </div>

              </Link>
             
              </p>
          ))}

          {JSON.stringify(eventPart.data)}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

