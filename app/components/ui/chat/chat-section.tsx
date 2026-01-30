"use client";

import { deslugify, uuidv4 } from "@/app/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@ai-sdk/react";
import { ChatSection as ChatUI } from "@llamaindex/chat-ui";
import { DefaultChatTransport } from "ai";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import DisclaimerMessage from "../../content/DisclaimerMessage";
import { ResizablePanel, ResizablePanelGroup } from "../resizable";
import { ChatCanvasPanel } from "./canvas/panel";
import CustomChatMessages from "./chat-messages";
import { DynamicEventsErrors } from "./custom/events/dynamic-events-errors";
import { fetchComponentDefinitions } from "./custom/events/loader";
import { ComponentDef } from "./custom/events/types";

export default function ChatSection({
  conversationId,
  readOnly,
  locale,
  starterQuestion,
  apiEndpoint = "/api/chat",
}: {
  conversationId?: string;
  readOnly?: boolean;
  locale?: string;
  starterQuestion?: string;
  apiEndpoint?: string;
}) {
  const { setChatHandler, setChatStatus } = useChatStore();
  const searchParams = useSearchParams();
  const starterSentRef = useRef(false);
  const router = useRouter();
  const [isArchived, setIsArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeoutError, setTimeoutError] = useState(false);
  const [title, setTitle] = useState(undefined);
  const [summary, setSummary] = useState(undefined);

  const handleError = (error: unknown) => {
    if (!(error instanceof Error)) throw error;
    let errorMessage: string;
    try {
      const parsedError = JSON.parse(error.message);
      errorMessage = parsedError.detail || parsedError.error;

      // Check if this is an archived conversation error (status 410)
      if (
        error.message.includes('"status":410') ||
        error.message.includes("archived")
      ) {
        setIsArchived(true);
        return; // Don't show alert for archived conversations
      }
    } catch (e) {
      errorMessage = error.message;
    }
    alert(errorMessage);
  };

  const handleStartNewChat = () => {
    const newConversationId = uuidv4();
    const newUrl = `/chat/` + newConversationId;
    router.replace(newUrl);
  };

  const useChatHandler = useChat({
    transport: new DefaultChatTransport({
      api: apiEndpoint,
      body: {
        conversationId,
        locale,
      },
    }),
    onError: handleError,
    experimental_throttle: 100,
  });

  const handler = useChatHandler;
  const messages = handler.messages;
  const status = handler.status;

  useEffect(() => {
    setChatStatus(status);
  }, [status]);

  useEffect(() => {
    // if we just sent a message start the timeout
    // cause llamaindex agent has cooked error handling on the backend
    const lastMessage = messages[messages.length - 1];
  }, [messages]);

  // Set chat handler in Zustand store
  useEffect(() => {
    setChatHandler(useChatHandler);
  }, [setChatHandler]);

  // Load existing conversation if conversationId is provided
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const response = await fetch(`/api/chat/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          // Set the messages directly using the setMessages function
          useChatHandler.setMessages(data.messages);
          setIsArchived(data.archived);
          
          // Handle summary translation
          let localizedSummary = data.conversationSummary;
          if (data.conversationSummaryTranslation) {
            try {
              const translations = JSON.parse(data.conversationSummaryTranslation) as Record<string, string>;
              const locale = navigator.language.split('-')[0];
              localizedSummary = translations[locale] || data.conversationSummary;
            } catch {
              localizedSummary = data.conversationSummary;
            }
          }
          setSummary(localizedSummary);
          setTitle(data.title);
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
      }
      setLoading(false);
    };
    if (conversationId) {
      loadConversation();
    } else {
      // No conversationId means new chat - no loading needed
      setLoading(false);
    }
  }, [conversationId]);

  // Handle starter message from URL query parameter or prop
  useEffect(() => {
    // Priority: prop > URL query param
    const starterMessage = starterQuestion || searchParams.get("starter");
    
    if (
      starterMessage &&
      useChatHandler.messages.length === 0 &&
      !starterSentRef.current
    ) {
      starterSentRef.current = true;
      const messageText = starterQuestion || deslugify(starterMessage);
      useChatHandler.sendMessage({
        text: messageText,
      });

      // Remove the starter parameter from the URL to prevent loops (only if from URL)
      if (!starterQuestion && typeof window !== "undefined") {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("starter");
        const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ""}`;
        router.replace(newUrl);
      }
    }
  }, [searchParams, useChatHandler, router, starterQuestion]);

  return (
    <>
      {loading ? (
        <>
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin opacity-80" />
          </div>
        </>
      ) : (
        <>
          <div className="-mr-16 -ml-4 sm:mx-0">
            <ChatUI
              handler={handler}
              className="relative flex min-h-0 flex-1 flex-row justify-center gap-4 !bg-transparent !p-0"
            >
              <ResizablePanelGroup direction="horizontal">
                <ChatSectionPanel
                  isArchived={isArchived || !!readOnly}
                  hideControls={!!readOnly}
                  onStartNewChat={handleStartNewChat}
                  timeoutError={timeoutError}
                  conversationId={conversationId}
                  title={title}
                  summary={summary}
                />
                <ChatCanvasPanel />
              </ResizablePanelGroup>
            </ChatUI>
          </div>
        </>
      )}
    </>
  );
}

function ChatSectionPanel({
  isArchived,
  hideControls,
  onStartNewChat,
  timeoutError,
  conversationId,
  title,
  summary,
  showHeader = false,
}: {
  isArchived: boolean;
  onStartNewChat: () => void;
  timeoutError: boolean;
  hideControls?: boolean;
  conversationId?: string;
  title?: string;
  summary?: string;
  showHeader?: boolean;
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
    fetchComponentDefinitions().then(({ components, errors }) => {
      setComponentDefs(components);
      if (errors.length > 0) {
        setDynamicEventsErrors((prev) => [...prev, ...errors]);
      }
    });
  }, []);

  return (
    <ResizablePanel defaultSize={40} minSize={30} className="w-full">
      <div className="flex h-full w-full min-w-0 flex-1 flex-col gap-4">
        {timeoutError && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Request Timeout
                  </h3>
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                    I've ran out of credits to pay for the{" "}
                    <i>kimi-k2-instruct</i> model through OpenRouter. If you
                    can, please donate so I can keep the service running. For
                    now, you can still ask any of the Deep Research questions
                    listed in the portal, as the responses are cached. Please
                    try again later or reah out to me on X: @pjamessteven
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <DynamicEventsErrors
          errors={uniqueErrors}
          clearErrors={() => setDynamicEventsErrors([])}
        />

        {showHeader && (
          <div className="w-screen border-b p-4 sm:w-auto">
            {!isArchived && <DisclaimerMessage />}
            {title && <h3 className="text-xl font-semibold">{title}</h3>}
            {summary && (
              <h3 className="text-muted-foreground mt-4 mb-4">{summary}</h3>
            )}
          </div>
        )}

        <CustomChatMessages
          hideControls={hideControls}
          componentDefs={componentDefs}
          appendError={appendError}
          conversationId={conversationId}
        />

        {isArchived && (
          <div className="-mt-24 w-screen px-4 sm:w-auto">
            <div className="mb-32 rounded-lg border border-yellow-200 bg-yellow-50 p-4 sm:mx-0 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Conversation Archived
                    </h3>
                    <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                      This conversation was archived after 30 minutes of
                      inactivity. You can view the messages but cannot send new
                      ones.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResizablePanel>
  );
}
