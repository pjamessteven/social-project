"use client";

import { ChatMessage, TextPartType, usePart } from "@llamaindex/chat-ui";
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

/**
 * Renders the assistant/user markdown only when the current text part actually
 * contains content. Prevents empty or whitespace-only responses from rendering
 * as an empty markdown bubble.
 */
function NonEmptyMarkdown() {
  const part = usePart(TextPartType);
  if (!part?.text || !part.text.trim()) return null;
  return <ChatMessage.Content.Markdown />;
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
        <NonEmptyMarkdown />
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
