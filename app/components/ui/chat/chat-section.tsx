"use client";

import { HCaptchaDialog } from "@/app/components/ui/hcaptcha-dialog";
import { useCaptcha } from "@/app/hooks/useCaptcha";
import { deslugify, uuidv4 } from "@/app/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@ai-sdk/react";
import { ChatSection as ChatUI } from "@llamaindex/chat-ui";
import { DefaultChatTransport } from "ai";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import DisclaimerMessage from "../../content/DisclaimerMessage";
import { ResizablePanel, ResizablePanelGroup } from "../resizable";
import { ChatCanvasPanel } from "./canvas/panel";
import CustomChatMessages from "./chat-messages";
import { DynamicEventsErrors } from "./custom/events/dynamic-events-errors";
//import { fetchComponentDefinitions } from "./custom/events/loader";
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

  // Captcha state management
  const {
    isCaptchaRequired,
    showCaptchaDialog,
    pendingMessage,
    setShowCaptchaDialog,
    setPendingMessage,
    verifyCaptcha,
    resetCaptcha,
  } = useCaptcha();

  const handleError = (error: unknown) => {
    console.log("[Chat Error Handler] Error received:", error);

    if (!(error instanceof Error)) {
      console.error(
        "[Chat Error Handler] Error is not an Error instance:",
        error,
      );
      throw error;
    }

    let errorMessage: string = error.message;
    let parsedError: {
      requiresCaptcha?: boolean;
      status?: number;
      detail?: string;
      error?: string;
    } = {};

    try {
      // Try to parse the error message as JSON
      try {
        parsedError = JSON.parse(error.message);
        errorMessage = parsedError.detail || parsedError.error || error.message;
        console.log("[Chat Error Handler] Parsed error:", parsedError);
      } catch (parseError) {
        console.log("[Chat Error Handler] Could not parse error as JSON");
      }

      // Check if this is a captcha required error (status 402)
      // Check multiple possible formats
      const isCaptchaError =
        error.message.includes("402") ||
        error.message.includes("captcha") ||
        error.message.includes("CAPTCHA") ||
        parsedError.requiresCaptcha === true ||
        parsedError.status === 402;

      console.log("[Chat Error Handler] Is captcha error:", isCaptchaError);

      if (isCaptchaError) {
        // Get the chat handler from the store to access messages
        const chatHandler = useChatStore.getState().chatHandler;
        // Get the last user message to retry after captcha
        const messages = chatHandler?.messages || [];
        const lastMessage = messages[messages.length - 1];
        console.log("[Chat Error Handler] Messages count:", messages.length);
        console.log("[Chat Error Handler] Last message:", lastMessage);

        if (lastMessage?.role === "user") {
          const text =
            lastMessage.parts[0]?.type === "text"
              ? lastMessage.parts[0].text
              : "";
          console.log("[Chat Error Handler] Setting pending message:", text);
          setPendingMessage({ text, conversationId });

          // Remove the failed message from the chat UI
          chatHandler?.setMessages((prevMessages) => prevMessages.slice(0, -1));
        }

        setShowCaptchaDialog(true);
      }

      // Check if this is an archived conversation error (status 410)
      if (
        error.message.includes("410") ||
        error.message.includes("archived") ||
        parsedError.status === 410
      ) {
        setIsArchived(true);
      }

      // Check if this is a rate limit error (status 429)
      if (
        error.message.includes("429") ||
        parsedError.status === 429 ||
        error.message.includes("rate limit")
      ) {
        toast.error("Too many requests, slow down");
      }
    } catch (e) {
      console.error("[Chat Error Handler] Error in error handler:", e);
    }

    alert(errorMessage);

    throw new Error(errorMessage);
  };

  const handleCaptchaVerify = async (token: string) => {
    console.log("[Captcha Verify] Starting verification with token");

    const success = await verifyCaptcha(token);
    console.log("[Captcha Verify] Success:", success);

    if (success) {
      // Close dialog first
      setShowCaptchaDialog(false);

      if (pendingMessage?.text) {
        const textToSend = pendingMessage.text;
        console.log("[Captcha Verify] Retrying message:", textToSend);

        // Small delay to ensure dialog closes and state updates
        setTimeout(() => {
          try {
            // Clear the error state before retrying (required by useChat API)
            clearError?.();
            useChatHandler.sendMessage({
              text: textToSend,
            });
            console.log("[Captcha Verify] Message sent successfully");
          } catch (sendError) {
            console.error("[Captcha Verify] Error sending message:", sendError);
          }
        }, 100);

        setPendingMessage(null);
      } else {
        console.log("[Captcha Verify] No pending message to retry");
      }
    }
  };

  const handleCaptchaClose = () => {
    setShowCaptchaDialog(false);
    // Don't clear pending message - user might want to try again
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
  const clearError = handler.clearError;

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
    setChatHandler(handler);
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
              const translations = JSON.parse(
                data.conversationSummaryTranslation,
              ) as Record<string, string>;
              const locale = navigator.language.split("-")[0];
              localizedSummary =
                translations[locale] || data.conversationSummary;
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

      {/* hCaptcha Dialog */}
      <HCaptchaDialog
        isOpen={showCaptchaDialog}
        onClose={handleCaptchaClose}
        onVerify={handleCaptchaVerify}
        siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
      />
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
  /*
  useEffect(() => {
    fetchComponentDefinitions().then(({ components, errors }) => {
      setComponentDefs(components);
      if (errors.length > 0) {
        setDynamicEventsErrors((prev) => [...prev, ...errors]);
      }
    });
    }, []); */

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
            {title && <h3 className="text-xl font-semibold">{title}</h3>}
            {summary && (
              <h3 className="text-muted-foreground mt-4 mb-4">{summary}</h3>
            )}
          </div>
        )}
        {!isArchived && <DisclaimerMessage />}

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
