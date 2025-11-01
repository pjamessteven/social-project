"use client";

import { useChat } from "@ai-sdk/react";
import { ChatSection as ChatUI } from "@llamaindex/chat-ui";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResizablePanel, ResizablePanelGroup } from "../resizable";
import { ChatCanvasPanel } from "./canvas/panel";
import { deslugify, uuidv4 } from "@/app/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { Loader2 } from "lucide-react";
import CustomChatMessages from "./chat-messages";
import { DynamicEventsErrors } from "./custom/events/dynamic-events-errors";
import { fetchComponentDefinitions } from "./custom/events/loader";
import { ComponentDef } from "./custom/events/types";

export default function ChatSection({
  conversationId,
}: {
  conversationId?: string;
}) {
  const { setChatHandler} = useChatStore();
  const searchParams = useSearchParams();
  const starterSentRef = useRef(false);
  const router = useRouter();
  const [isArchived, setIsArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeoutError, setTimeoutError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const clearTimeoutRef = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleError = (error: unknown) => {
    clearTimeoutRef();
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
    const newUrl = `/chat/`+newConversationId;
    router.replace(newUrl);
  };

  const useChatHandler = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        conversationId,
      },
    }),
    onError: handleError,
    experimental_throttle: 100,
    onFinish: () => {
      clearTimeoutRef();
    },
  });

  const handler = useChatHandler;
  const messages = handler.messages

  // if no response in 1 min we can assume out of credits
  const startTimeout = () => {
    clearTimeoutRef();
    setTimeoutError(false);
    timeoutRef.current = setTimeout(() => {
      setTimeoutError(true);
      handler.stop()
    }, 120000); // 2 min
  };
  
  useEffect(() => {
    // if we just sent a message start the timeout
    // cause llamaindex agent has cooked error handling on the backend
    const lastMessage = messages[messages.length-1]
    if (lastMessage?.role === 'user') {
      startTimeout()
    }
  }, [messages])

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
        } else {
          console.error("Failed to load conversation:", response.statusText);
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
      }
      setLoading(false);
    };
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId]);

  // Handle starter message from URL query parameter
  useEffect(() => {
    const starterParam = searchParams.get("starter");
    if (
      starterParam &&
      useChatHandler.messages.length === 0 &&
      !starterSentRef.current
    ) {
      starterSentRef.current = true;
      const starterMessage = deslugify(starterParam);
      useChatHandler.sendMessage({
        text: starterMessage,
      });

      // Remove the starter parameter from the URL to prevent loops
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("starter");
      const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams.toString()}` : ""}`;
      router.replace(newUrl);
    }
  }, [searchParams, useChatHandler, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeoutRef();
    };
  }, []);

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
                  isArchived={isArchived}
                  onStartNewChat={handleStartNewChat}
                  timeoutError={timeoutError}
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
  onStartNewChat,
  timeoutError,
}: {
  isArchived: boolean;
  onStartNewChat: () => void;
  timeoutError: boolean;
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
      <div className="flex h-full min-w-0 flex-1 flex-col gap-4">
        {isArchived && (
          <div className="mx-4 mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Conversation Archived
                  </h3>
                  <p className="text-xs mt-1 text-yellow-700 dark:text-yellow-300">
                    This conversation was archived after 30 minutes of
                    inactivity. You can view the messages but cannot send new
                    ones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {timeoutError && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Request Timeout
                  </h3>
                  <p className="text-xs mt-1 text-red-700 dark:text-red-300">
                    I've ran out of credits to pay for the <i>kimi-k2-instruct</i> model through OpenRouter. If you can, please donate so I can keep the service running. For now, you can still ask any of the Deep Research questions listed in the portal, as the responses are cached. Please try again later or reah out to me on X: @pjamessteven
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
        <CustomChatMessages
          componentDefs={componentDefs}
          appendError={appendError}
        />

      </div>
    </ResizablePanel>
  );
}
