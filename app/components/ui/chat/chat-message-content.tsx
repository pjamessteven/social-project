"use client";

import { ChatMessage } from "@llamaindex/chat-ui";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";
import { ToolAnnotations } from "./tools/chat-tools";
import { getAnnotationData, MessageAnnotationType } from "@llamaindex/chat-ui";
import { useChatMessage, useChatUI } from "@llamaindex/chat-ui";
import Link from "next/link";

function SuggestedQuestionsAnnotations() {
  const { append, requestData } = useChatUI();
  const { message, isLast } = useChatMessage();

  if (!isLast || !append) return null;

  const suggestedQuestionsData = getAnnotationData(
    message,
    MessageAnnotationType.SUGGESTED_QUESTIONS
  );
  if (suggestedQuestionsData.length === 0) return null;

  const questions = suggestedQuestionsData[0] as string[];

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {questions.map((q, idx) => (
        <Link
          key={idx}
          href={`/search?q=${encodeURIComponent(q)}`} // <-- change to whatever route / query you need
          className="inline-flex items-center rounded-full border px-3 py-1 text-sm hover:bg-accent"
        >
          {q}
        </Link>
      ))}
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
    <ChatMessage.Content>
      <ChatMessage.Content.Event />
      <ChatMessage.Content.AgentEvent />
      <ToolAnnotations />
      <ChatMessage.Content.Image />
      <DynamicEvents componentDefs={componentDefs} appendError={appendError} />
      <ChatMessage.Content.Markdown />
      <ChatMessage.Content.DocumentFile />
      <ChatMessage.Content.Source />
      <SuggestedQuestionsAnnotations />
    </ChatMessage.Content>
  );
}
