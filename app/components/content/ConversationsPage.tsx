"use client";

import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import ChatSection from "../ui/chat/chat-section";
import FullWidthPage from "./FullWidthPage";

export interface ConversationSummary {
  uuid: string;
  title: string | null;
  updatedAt: string;
  mode: string;
  messages: string;
}

export interface ConversationsResponse {
  items: ConversationSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ConversationsPageClientProps {
  currentConversationId?: string;
}

interface MessagePart {
  type: "text";
  text: string;
}

interface Message {
  parts: MessagePart[];
  id: string;
  role: "user" | "model";
}

const ConversationItem = ({
  convo,
  isActive,
  onClick,
}: {
  convo: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
}) => {
  let userMessages: Message[] = [];
  try {
    if (convo.messages) {
      const parsedMessages = JSON.parse(convo.messages);
      if (Array.isArray(parsedMessages)) {
        userMessages = parsedMessages.filter(
          (msg: any) => msg.role === "user" && Array.isArray(msg.parts),
        );
      }
    }
  } catch (e) {
    console.error("Failed to parse messages for convo", convo.uuid, e);
  }

  return (
    <li>
      <button
        onClick={onClick}
        className={`block w-full text-left rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${
          isActive ? "bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-900/20" : ""
        }`}
      >
        <p className="truncate text-sm font-semibold">
          {convo.title || "Untitled Conversation"}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {convo.mode} - Updated{" "}
          {formatDistanceToNow(new Date(convo.updatedAt), {
            addSuffix: true,
          })}
        </p>
        <div className="mt-2 space-y-1">
          {userMessages.map((msg) =>
            msg.parts.map((part, partIndex) => (
              <p
                key={`${msg.id}-${partIndex}`}
                className="truncate text-xs text-gray-600 dark:text-gray-300"
              >
                - {part.text}
              </p>
            )),
          )}
        </div>
      </button>
    </li>
  );
};

export default function ConversationsPageClient({
  currentConversationId: initialConversationId,
}: ConversationsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentConversationId, setCurrentConversationId] = useState(initialConversationId);
  const [conversationItems, setConversationItems] = useState<ConversationSummary[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const desktopSentinel = useRef<HTMLDivElement | null>(null);
  const mobileSentinel = useRef<HTMLDivElement | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/chat/conversations');
        if (response.ok) {
          const data = await response.json();
          setConversationItems(data.items || []);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Update currentConversationId when URL changes
  useEffect(() => {
    setCurrentConversationId(initialConversationId);
  }, [initialConversationId]);

  const handleConversationClick = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setSidebarOpen(false); // Close mobile sidebar
    router.push(`/conversations/${conversationId}`);
  };

  const loadMoreConversations = useCallback(async () => {
    if (loading || !pagination || pagination.page >= pagination.totalPages)
      return;

    setLoading(true);
    const nextPage = pagination.page + 1;
    try {
      const response = await fetch(
        `/api/chat/conversations?page=${nextPage}&limit=${pagination.limit}`,
      );
      const data = await response.json();
      setConversationItems((prevItems) => [...prevItems, ...data.items]);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch more conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, pagination]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMoreConversations();
        }
      },
      {
        rootMargin: "0px",
      },
    );

    if (desktopSentinel.current) {
      observer.observe(desktopSentinel.current);
    }
    if (mobileSentinel.current) {
      observer.observe(mobileSentinel.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loadMoreConversations]);

  if (initialLoading) {
    return (
      <FullWidthPage>
        <div className="flex items-center justify-center h-64">
          <p>Loading conversations...</p>
        </div>
      </FullWidthPage>
    );
  }

  return (
    <FullWidthPage>
      <div className="no-wrap flex w-full flex-row">
        {/* Sidebar for larger screens */}
        <div className="hidden h-full w-80 flex-shrink-0 border-r border-gray-200 bg-white lg:block dark:border-gray-700 dark:bg-gray-800">
          <div className="h-full">
            <h2 className="mb-4 bg-white p-4 text-xl font-bold dark:bg-black">
              Conversations
            </h2>
            <ul className="h-full space-y-1 overflow-y-auto px-4">
              {conversationItems.map((convo) => (
                <ConversationItem
                  key={convo.uuid}
                  convo={convo}
                  isActive={currentConversationId === convo.uuid}
                  onClick={() => handleConversationClick(convo.uuid)}
                />
              ))}
            </ul>
            {pagination && pagination.page < pagination.totalPages && (
              <div ref={desktopSentinel} />
            )}
            {loading && <p className="py-4 text-center">Loading...</p>}
          </div>
        </div>

        {/* Mobile sidebar */}
        <div
          className={`no-wrap fixed inset-0 z-40 flex flex-row lg:hidden ${
            sidebarOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Overlay */}
          <div
            className={`fixed inset-0 bg-black transition-opacity ${
              sidebarOpen ? "opacity-50" : "opacity-0"
            }`}
            onClick={() => setSidebarOpen(false)}
          ></div>

          {/* Sidebar panel */}
          <div
            className={`relative flex w-full max-w-xs flex-1 transform flex-col bg-white transition-transform duration-300 ease-in-out dark:bg-gray-800 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="h-full overflow-y-auto p-4">
              <h2 className="mb-4 text-xl font-bold">Conversations</h2>
              <ul className="space-y-1">
                {conversationItems.map((convo) => (
                  <ConversationItem
                    key={convo.uuid}
                    convo={convo}
                    isActive={currentConversationId === convo.uuid}
                    onClick={() => handleConversationClick(convo.uuid)}
                  />
                ))}
              </ul>
              {pagination && pagination.page < pagination.totalPages && (
                <div ref={mobileSentinel} />
              )}
              {loading && <p className="py-4 text-center">Loading...</p>}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header with sidebar toggle */}
          <header className="bg-white p-2 shadow-sm lg:hidden dark:bg-gray-900">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span className="sr-only">Open sidebar</span>
            </button>
          </header>

          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-6">
            {!currentConversationId ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Select a conversation</h1>
                  <p className="mt-2 text-gray-500">
                    Choose a conversation from the sidebar to view its contents.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <div className="max-w-3xl">
                  <ChatSection
                    conversationId={currentConversationId}
                    key={currentConversationId}
                    readOnly={true}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </FullWidthPage>
  );
}
