"use client";

import { useChat } from "@ai-sdk/react";
import { ChatSection as ChatUI } from "@llamaindex/chat-ui";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getConfig } from "../lib/utils";
import { ResizablePanel, ResizablePanelGroup } from "../resizable";
import { ChatCanvasPanel } from "./canvas/panel";


import CustomChatMessages from "./chat-messages";
import { DynamicEventsErrors } from "./custom/events/dynamic-events-errors";
import { fetchComponentDefinitions } from "./custom/events/loader";
import { ComponentDef } from "./custom/events/types";
import { useChatStore } from "@/stores/chat-store";
import { deslugify } from "@/app/lib/utils";

export default function ChatSection({ conversationId }: { conversationId?: string }) {
  const deployment = getConfig("DEPLOYMENT") || "";
  const { setChatHandler } = useChatStore();
  const searchParams = useSearchParams();
  const starterSentRef = useRef(false);

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
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onError: handleError,
    experimental_throttle: 100,
    body: conversationId ? { conversationId } : undefined,
  });

  const handler = useChatHandler;

  // Set chat handler in Zustand store
  useEffect(() => {
    setChatHandler(useChatHandler);
  }, [setChatHandler]);

  // Load existing conversation if conversationId is provided
  useEffect(() => {
    if (conversationId && useChatHandler.messages.length === 0) {
      const loadConversation = async () => {
        try {
          const response = await fetch(`/api/chat/${conversationId}`);
          if (response.ok) {
            const data = await response.json();
            // Set the messages directly using the setMessages function
            useChatHandler.setMessages(data.messages);
          } else {
            console.error("Failed to load conversation:", response.statusText);
          }
        } catch (error) {
          console.error("Error loading conversation:", error);
        }
      };
      loadConversation();
    }
  }, [conversationId, useChatHandler]);

  // Handle pending chat message from sessionStorage
  useEffect(() => {
    const pendingMessage = sessionStorage.getItem("pendingChatMessage");
    if (pendingMessage) {
      sessionStorage.removeItem("pendingChatMessage");
      useChatHandler.sendMessage({
        text: pendingMessage,
      });
    }
  }, [useChatHandler]);

  // Handle starter message from URL query parameter
  useEffect(() => {
    const starterParam = searchParams.get("starter");
    if (starterParam && useChatHandler.messages.length === 0 && !starterSentRef.current) {
      starterSentRef.current = true;
      const starterMessage = deslugify(starterParam);
      useChatHandler.sendMessage({
        text: starterMessage,
      });
    }
  }, [searchParams, useChatHandler]);

  return (
    <>
        <div className="-mr-16 -ml-4 sm:mx-0">
        <ChatUI
          handler={handler}
            className="relative flex min-h-0 flex-1 flex-row justify-center gap-4 !bg-transparent !p-0"
        >
          <ResizablePanelGroup direction="horizontal">
            <ChatSectionPanel />
            <ChatCanvasPanel />
          </ResizablePanelGroup>

        </ChatUI>
      </div>

    </>
  );
}

function ChatSectionPanel() {
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
    fetchComponentDefinitions().then(({ components, errors }) => {
      setComponentDefs(components);
      if (errors.length > 0) {
        setDynamicEventsErrors((prev) => [...prev, ...errors]);
      }
    });
  }, []);

  return (
    <ResizablePanel defaultSize={40} minSize={30} className="w-full">
      <div className="flex h-full min-w-0 flex-1 flex-col gap-4">
        <DynamicEventsErrors
          errors={uniqueErrors}
          clearErrors={() => setDynamicEventsErrors([])}
        />
        <CustomChatMessages
          componentDefs={componentDefs}
          appendError={appendError}
        />
      </div>
    </ResizablePanel>
  );
}
