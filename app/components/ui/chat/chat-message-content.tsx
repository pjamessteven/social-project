"use client";

import { ChatMessage } from "@llamaindex/chat-ui";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";
import StoryQueryEventPart from "./story-query-event";
import CommentQueryEventPart from './comment-query-event'
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

export function ChatMessageContent({
  componentDefs,
  appendError,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
}) {
  return (
    <ChatMessage.Content className="gap-8">
      <DynamicEvents componentDefs={componentDefs} appendError={appendError} />
      <ChatMessage.Content.Markdown />
      <ChatMessage.Content.Source />
      <ChatMessage.Content.Suggestion />
      <VideoQueryEventPart />
      <StoryQueryEventPart />
      <CommentQueryEventPart />
    </ChatMessage.Content>
  );
}
