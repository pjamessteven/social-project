"use client";

import { useChatUI, usePart } from "@llamaindex/chat-ui";
import clsx from "clsx";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../accordion";

export type EventPartData = {
  id?: string | undefined;
  type: string;
  data: {
    title: string;
    query?: string;
    result?: any;
    status?: string;
  };
};

interface EventWrapperProps {
  eventType: string;
  label: string;
  query?: string;
  defaultExpanded?: boolean;
  analysingText?: string;
  children: React.ReactNode;
  disableExpand?: boolean;
  noAccordion?: boolean;
}

export function EventWrapper({
  eventType,
  label,
  query,
  defaultExpanded = false,
  analysingText,
  children,
  disableExpand,
  noAccordion,
}: EventWrapperProps) {
  const eventPart = usePart<EventPartData>(eventType);
  const t = useTranslations("chat");
  const { messages } = useChatUI();

  const isThinking = useMemo(() => {
    if (!eventPart) return false;
    const latestResponse = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    const lastPart: any =
      latestResponse?.parts?.[latestResponse.parts.length - 1];
    const secondLastPart: any =
      latestResponse?.parts?.[latestResponse.parts.length - 2];
    if (!lastPart) return false;
    return (
      lastPart.id === eventPart.id ||
      (secondLastPart?.id === eventPart.id && lastPart.text === "")
    );
  }, [messages, eventPart]);

  const isLoading = !eventPart?.data.status;
  const isError = eventPart?.data.status === "error";

  if (!eventPart) return null;

  return (
    <>
      {noAccordion ? (
        <>{children}</>
      ) : (
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultExpanded ? "content" : undefined}
          className="not-prose -mt-2 w-full"
        >
          <AccordionItem
            value="content"
            className="text-muted-foreground w-full overflow-hidden border-none"
          >
            <AccordionTrigger
              disabled={isLoading}
              hideIndicator
              className={clsx(
                "group text-muted-foreground bg-secondary/80 dark:bg-secondary relative m-0 w-full items-start overflow-hidden rounded-2xl border p-0 hover:no-underline",
                disableExpand && "pointer-events-none",
              )}
            >
              <div className="flex w-full flex-col">
                <div className="flex w-full flex-row items-center justify-between px-4 py-3 text-base dark:bg-black/30">
                  <div className="no-wrap flex flex-row items-baseline pr-2">
                    <div className="text-primary-background font-normal">
                      <span className="font-medium">{label}</span>
                      {query && <span>{": "}</span>}
                      {query && (
                        <span className="text-muted-foreground italic">
                          {query}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {isLoading && (
                      <Loader2 className="mr-2 ml-2 h-4 min-w-4 animate-spin text-blue-500" />
                    )}
                    {!isLoading && !isError && !disableExpand && (
                      <div className="flex items-center">
                        <ChevronDown className="mr-1 h-5 w-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </div>
                    )}
                    {isError && (
                      <span className="mr-2 ml-2 h-4 min-w-4 text-red-500">
                        ✗
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            {!disableExpand && (
              <AccordionContent className="flex max-w-full flex-col pb-3 [&_.not-prose]:border-0 [&_.not-prose]:bg-transparent [&_.not-prose]:px-0 [&_.not-prose]:py-0 [&_svg]:hidden">
                {children}
              </AccordionContent>
            )}
          </AccordionItem>
        </Accordion>
      )}
      {isThinking && !isError && !isLoading && (
        <div className="flex w-full items-center justify-start pb-2">
          <span className="text-muted-foreground text-sm italic">
            {analysingText || t("analysingResults")}
          </span>
          <Loader2 className="ml-2 h-4 w-4 animate-spin text-black dark:text-white" />
        </div>
      )}
    </>
  );
}
