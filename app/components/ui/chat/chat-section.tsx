"use client";

import { ChatSection as ChatUI } from "@llamaindex/chat-ui";
import { useChat } from "ai/react";
import { useEffect, useMemo, useState } from "react";
import { ChatInjection } from "./chat-injection";

import CustomChatMessages from "./chat-messages";
import { DynamicEventsErrors } from "./custom/events/dynamic-events-errors";
import { fetchComponentDefinitions } from "./custom/events/loader";
import { ComponentDef } from "./custom/events/types";
import { ChatLayout } from "./layout";

export default function ChatSection({
  onReset,
  starterQuestion,
  mode,
  showDonationMessage,
}: {
  onReset: () => void;
  starterQuestion?: string;
  mode: "detrans" | "affirm";
  showDonationMessage: boolean;
}) {
  const handleError = (error: unknown) => {
    if (!(error instanceof Error)) throw error;
    let errorMessage: string;
    try {
      errorMessage = JSON.parse(error.message).detail;
    } catch (e) {
      errorMessage = error.message;
    }
    alert(errorMessage);
  };

  const useChatHandler = useChat({
    api: mode == "affirm" ? "/api/chat/affirm" : "/api/chat/detrans",
    onError: handleError,
    experimental_throttle: 100,
  });

  useEffect(() => {
    if (starterQuestion) {
      useChatHandler.append({
        role: "user",
        content: starterQuestion,
      });
    }
  }, []);
  return (
    <>
      <ChatLayout>
        <div className="-ml-4 -mr-16 sm:mx-0">
          <ChatUI
            handler={useChatHandler}
            className="relative flex min-h-0 flex-1 flex-row justify-center gap-4 !bg-transparent !p-0"
          >
            <ChatSectionPanel
              onReset={onReset}
              mode={mode}
              showDonationMessage={showDonationMessage}
            />
          </ChatUI>
        </div>
      </ChatLayout>
      <ChatInjection />
    </>
  );
}

function ChatSectionPanel({
  onReset,
  mode,
  showDonationMessage,
}: {
  onReset: () => void;
  mode: "detrans" | "affirm";
  showDonationMessage: boolean;
}) {
  const [componentDefs, setComponentDefs] = useState<ComponentDef[]>([]);
  const [dynamicEventsErrors, setDynamicEventsErrors] = useState<string[]>([]); // contain all errors when rendering dynamic events from componentDir

  const appendError = (error: string) => {
    setDynamicEventsErrors((prev) => [...prev, error]);
  };

  const uniqueErrors = useMemo(() => {
    return Array.from(new Set(dynamicEventsErrors));
  }, [dynamicEventsErrors]);

  // fetch component definitions and use Babel to tranform JSX code to JS code
  // this is triggered only once when the page is initialised
  useEffect(() => {
    console.log("mode", mode);
    fetchComponentDefinitions({ mode }).then(({ components, errors }) => {
      setComponentDefs(components);
      if (errors.length > 0) {
        setDynamicEventsErrors((prev) => [...prev, ...errors]);
      }
    });
  }, []);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-4">
      <DynamicEventsErrors
        errors={uniqueErrors}
        clearErrors={() => setDynamicEventsErrors([])}
      />
      <CustomChatMessages
        showDonationMessage={showDonationMessage}
        componentDefs={componentDefs}
        appendError={appendError}
        onReset={onReset}
        mode={mode}
      />
    </div>
  );
}
