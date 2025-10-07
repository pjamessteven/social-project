"use client";

import { capitaliseFirstWord, slugify } from "@/app/lib/utils";
import {
  ChatMessage,
  getAnnotationData,
  MessageAnnotationType,
  useChatMessage,
  useChatUI,
} from "@llamaindex/chat-ui";
import Link from "next/link";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";
import { ToolAnnotations } from "./tools/chat-tools";

function SuggestedQuestionsAnnotations() {
  const { append, requestData } = useChatUI();
  const { message, isLast } = useChatMessage();

  if (!isLast || !append) return null;

  const suggestedQuestionsData = getAnnotationData(
    message,
    MessageAnnotationType.SUGGESTED_QUESTIONS,
  );
  if (suggestedQuestionsData.length === 0) return null;

  const questions = suggestedQuestionsData[0] as string[];

  return (
    <div className="sm:mt-8  flex flex-col gap-2">

      <div className="text-base font-semibold md:text-lg mb-2 ">Follow-up questions:</div>
      {questions.map((question, index) => (
        <Link
          prefetch={false}
          key={index}
          href={"/chat/" + slugify(question)}
          className="cursor-pointer font-medium  italic no-underline"
        >
          <div className="flex flex-row items-center border-b pt-1 pb-2">
            <div className="text-muted-foreground hover:text-foreground transition-colors no-wrap flex cursor-pointer flex-row items-start text-base italic opacity-90 sm:text-base">
              <div className="mr-2 whitespace-nowrap">{"->"}</div>
              <div className=" hover:underline">{capitaliseFirstWord(question)}`</div>
            </div>
          </div>
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
