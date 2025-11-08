"use client";

import { capitaliseFirstWord, cn } from "@/app/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import {
  ChatMessage,
  getParts,
  SuggestionPart,
  SuggestionPartType,
  useChatMessage,
} from "@llamaindex/chat-ui";
import CommentQueryEventPart from "./comment-query-event";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";
import StoryQueryEventPart from "./story-query-event";
import VideoQueryEventPart from "./video-query-event";

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
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  tags: string[];
  commentCount: number;
  transitionAge: number | null;
  detransitionAge: number | null;
}

function SuggestedQuestionsAnnotations({}: {}) {
  const isDev = process.env.NODE_ENV === "development";

  const { sendMessage } = useChatStore();
  const { message, isLast } = useChatMessage();

  if (!isLast) return null;

  const suggestedQuestionsData = getParts<SuggestionPart>(
    message,
    SuggestionPartType,
  );
  if (suggestedQuestionsData.length === 0) return null;

  const questions = suggestedQuestionsData[0].data;

  return (
    <div className="animate-in slide-in-from-top-2 duration-500 ease-out overflow-hidden transition-all">
      <div className="flex flex-col gap-2 sm:mt-8">
        <div className="mb-2 text-base font-semibold md:text-lg">
          Follow-up questions:
        </div>
        {questions.map((question, index) => (
          <div
            key={index}
            onClick={() => sendMessage(question)}
            className="cursor-pointer font-medium italic no-underline"
          >
            <div className={cn("flex flex-row items-center  pt-1 pb-2", index < questions.length -0 && 'border-b')}>
              <div className="text-muted-foreground hover:text-foreground no-wrap flex cursor-pointer flex-row items-start text-base italic opacity-90 transition-colors sm:text-base">
                <div className="mr-2 whitespace-nowrap">{"->"}</div>
                <div className="hover:underline">
                  {capitaliseFirstWord(question)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatMessageContent({
  componentDefs,
  appendError,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
}) {
  return (
    <div className="flex w-full flex-col">
      <ChatMessage.Content className="gap-6">
        <DynamicEvents
          componentDefs={componentDefs}
          appendError={appendError}
        />
        <ChatMessage.Content.Markdown />
        <ChatMessage.Content.Source />
        <VideoQueryEventPart />
        <StoryQueryEventPart />
        <CommentQueryEventPart />
      </ChatMessage.Content>
      <SuggestedQuestionsAnnotations />
    </div>
  );
}
