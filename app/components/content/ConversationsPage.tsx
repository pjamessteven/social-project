"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
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
}} 



interface ConversationsPageClientProps {
  conversations: ConversationsResponse | undefined
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
  onClick,
}: {
  convo: ConversationSummary;
  onClick?: () => void;
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
      <Link
        href={`/chat/${convo.uuid}`}
        className="block p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={onClick}
      >
        <p className="font-semibold truncate text-sm">
          {convo.title || "Untitled Conversation"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                className="text-xs text-gray-600 dark:text-gray-300 truncate"
              >
                - {part.text}
              </p>
            )),
          )}
        </div>
      </Link>
    </li>
  );
};

export default function ConversationsPageClient({
  conversations: initialConversations,
}: ConversationsPageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationItems, setConversationItems] = useState<
    ConversationSummary[]
  >(initialConversations?.items || []);
  const [pagination, setPagination] = useState(initialConversations?.pagination);
  const [loading, setLoading] = useState(false);

  const desktopSentinel = useRef<HTMLDivElement | null>(null);
  const mobileSentinel = useRef<HTMLDivElement | null>(null);

  const loadMoreConversations = useCallback(async () => {
    if (loading || !pagination ||  pagination.page >= pagination.totalPages) return;

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
        rootMargin: "100px",
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

  return (
    <FullWidthPage>
      {/* Sidebar for larger screens */}
      <div className="hidden lg:block bg-white h-full dark:bg-gray-800 w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
        <div className="h-full ">
          <h2 className="text-xl font-bold mb-4  bg-white dark:bg-black p-4" >Conversations</h2>
          <ul className="space-y-1 px-4 h-full  overflow-y-auto ">
            {conversationItems.map((convo) => (
              <ConversationItem key={convo.uuid} convo={convo} />
            ))}
          </ul>
          {pagination &&    pagination.page < pagination.totalPages && (
            <div ref={desktopSentinel} />
          )}
          {loading && <p className="text-center py-4">Loading...</p>}
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 flex lg:hidden ${
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
          className={`relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Conversations</h2>
            <ul className="space-y-1">
              {conversationItems.map((convo) => (
                <ConversationItem
                  key={convo.uuid}
                  convo={convo}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </ul>
            {pagination && pagination.page < pagination.totalPages && (
              <div ref={mobileSentinel} />
            )}
            {loading && <p className="text-center py-4">Loading...</p>}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden hidden">
        {/* Header with sidebar toggle */}
        <header className="bg-white dark:bg-gray-900 shadow-sm p-2 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
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
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Select a conversation</h1>
              <p className="text-gray-500 mt-2">
                Choose a conversation from the sidebar to view its contents.
              </p>
            </div>
          </div>
        </main>
      </div>
    </FullWidthPage>
  );
}
