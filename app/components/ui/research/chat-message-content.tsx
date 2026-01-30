"use client";

import { capitaliseFirstWord, slugify } from "@/app/lib/utils";
import { Link } from "@/i18n/routing";
import {
  ChatMessage,
  getParts,
  SuggestionPart,
  SuggestionPartType,
  useChatMessage,
  useChatUI,
} from "@llamaindex/chat-ui";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";

function SuggestedQuestionsAnnotations({
  mode,
}: {
  mode: "detrans" | "affirm" | "compare";
}) {
  const isDev = process.env.NODE_ENV === "development";

  const { requestData } = useChatUI();
  const { message, isLast } = useChatMessage();

  if (!isLast) return null;

  const suggestedQuestionsData = getParts<SuggestionPart>(
    message,
    SuggestionPartType,
  );
  if (suggestedQuestionsData.length === 0) return null;

  const questions = suggestedQuestionsData[0].data;

  const getQuestionUrl = (question: string) => {
    let baseUrl;
    if (mode === "detrans") {
      baseUrl = "/research/";
    }
    return baseUrl + slugify(question);
  };

  return (
    <div className="flex flex-col gap-2 sm:mt-8">
      <div className="mb-2 text-base font-semibold md:text-lg">
        Follow-up questions:
      </div>
      {questions.map((question, index) => (
        <Link
          prefetch={false}
          key={index}
          href={getQuestionUrl(question) as any}
          className="cursor-pointer font-medium italic no-underline"
        >
          <div className="flex flex-row items-center border-b pt-1 pb-2">
            <div className="text-muted-foreground hover:text-foreground no-wrap flex cursor-pointer flex-row items-start text-base italic opacity-90 transition-colors sm:text-base">
              <div className="mr-2 whitespace-nowrap">{"->"}</div>
              <div className="hover:underline">
                {capitaliseFirstWord(question)}
              </div>
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
  mode,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
  mode: "detrans" | "affirm" | "compare";
}) {
  const { message, isLast } = useChatMessage();

  return (
    <div className="flex w-full flex-col">
      <DynamicEvents componentDefs={componentDefs} appendError={appendError} />

      <ChatMessage.Content>
        <ChatMessage.Part.Event />
        <ChatMessage.Part.Markdown />
        <ChatMessage.Part.Source />
      </ChatMessage.Content>

      {<SuggestedQuestionsAnnotations mode={mode} />}
    </div>
  );
}
