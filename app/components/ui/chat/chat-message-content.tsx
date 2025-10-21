"use client";

import { ChatMessage } from "@llamaindex/chat-ui";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";


export function ChatMessageContent({
  componentDefs,
  appendError,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
}) {
  return (
    <ChatMessage.Content>
      <ChatMessage.Content.Event />
      <DynamicEvents componentDefs={componentDefs} appendError={appendError} />
      <ChatMessage.Content.Markdown />
      <ChatMessage.Content.Source />
      <ChatMessage.Content.Suggestion />
    </ChatMessage.Content>
  );
}
