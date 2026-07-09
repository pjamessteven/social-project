"use client";

import { ChatMessage } from "@llamaindex/chat-ui";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";
import {
  CommentQueryEventPart,
  GetStudiesEventPart,
  QuestionsEventPart,
  StudyQueryEventPart,
  TransCommentQueryEventPart,
  VideoQueryEventPart,
  WebSearchEventPart,
} from "./tool-components/EventParts";

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
        <StudyQueryEventPart />
        <CommentQueryEventPart />
        <TransCommentQueryEventPart />
        <WebSearchEventPart />
        <GetStudiesEventPart />
        <QuestionsEventPart />
      </ChatMessage.Content>
    </div>
  );
}
