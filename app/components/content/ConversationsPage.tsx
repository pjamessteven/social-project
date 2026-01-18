"use client";

import { toggleFeaturedAPI } from "@/app/lib/utils";
import { useUserStore } from "@/stores/user-store";
import { List, Star } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatSection from "../ui/chat/chat-section";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import AdminPanel from "./AdminPanel";
import { ConversationCard } from "./ConversationCard/ConversationCard";
import FullWidthPage from "./FullWidthPage";

export interface ConversationSummary {
  uuid: string;
  title: string | null;
  updatedAt: string;
  mode: string;
  messages: string;
  featured: boolean;
  conversationSummary: string | null;
  country: string | null;
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

export default function ConversationsPageClient({
  currentConversationId: initialConversationId,
}: ConversationsPageClientProps) {
  const { isAuthenticated, user, isLoading: authLoading } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentConversationId, setCurrentConversationId] = useState(
    initialConversationId || searchParams.get("conversationId") || undefined,
  );
  const [conversationItems, setConversationItems] = useState<
    ConversationSummary[]
  >([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [togglingFeaturedUuid, setTogglingFeaturedUuid] = useState<
    string | null
  >(null);
  const isFeaturedView = searchParams.get("featured") === "true";

  const desktopSentinel = useRef<HTMLDivElement | null>(null);
  const mobileSentinel = useRef<HTMLDivElement | null>(null);

  // Check auth status on mount
  const checkAuthStatus = useCallback(async () => {
    try {
      // Wait for auth to be checked by AuthInitializer
      // Just set authChecked to true after a short delay
      setTimeout(() => {
        setAuthChecked(true);
      }, 100);
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Fetch conversations on mount and when tab changes
  const fetchConversations = useCallback(
    async (page = 1) => {
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "20");
        if (isFeaturedView) {
          params.set("featured", "true");
        }

        const response = await fetch(`/api/chat?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (page === 1) {
            setConversationItems(data.items || []);
          } else {
            setConversationItems((prevItems) => [...prevItems, ...data.items]);
          }
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        if (page === 1) {
          setInitialLoading(false);
        }
        setLoading(false);
      }
    },
    [isFeaturedView],
  );

  // Initial fetch
  useEffect(() => {
    if (conversationItems.length === 0) {
      fetchConversations(1);
    }
  }, [fetchConversations, conversationItems.length]);

  // Reset and refetch when tab changes
  useEffect(() => {
    setConversationItems([]);
    setPagination(null);
    setInitialLoading(true);
    fetchConversations(1);
  }, [isFeaturedView, fetchConversations]);

  // Redirect non-admin users from All tab to Featured tab
  useEffect(() => {
    if (authChecked && user?.role !== "admin" && !isFeaturedView) {
      // Non-admin user trying to view All tab, redirect to Featured
      const params = new URLSearchParams(searchParams);
      params.set("featured", "true");
      router.push(`/conversations?${params.toString()}`, { scroll: false });
    }
  }, [authChecked, user, isFeaturedView, router, searchParams]);

  // Update currentConversationId when URL changes
  useEffect(() => {
    const urlConversationId = searchParams.get("conversationId");
    const newConversationId =
      initialConversationId || urlConversationId || undefined;
    setCurrentConversationId(newConversationId);
  }, [initialConversationId, searchParams]);

  const handleConversationClick = (conversationId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("conversationId", conversationId);
    router.push(`/conversations?${params.toString()}`, {
      scroll: false,
    });
    setCurrentConversationId(conversationId);
    setSidebarOpen(false); // Close mobile sidebar
  };

  const switchToFeatured = () => {
    const params = new URLSearchParams(searchParams);
    params.set("featured", "true");
    router.push(`/conversations?${params.toString()}`, { scroll: false });
    setSidebarOpen(false);
  };

  const switchToAll = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("featured");
    router.push(`/conversations?${params.toString()}`, { scroll: false });
    setSidebarOpen(false);
  };

  const handleToggleFeatured = async (
    uuid: string,
    currentFeatured: boolean,
  ) => {
    setTogglingFeaturedUuid(uuid);
    try {
      const data = await toggleFeaturedAPI(uuid, currentFeatured);

      // Update the conversation in the local state
      setConversationItems((prevItems) =>
        prevItems.map((item) =>
          item.uuid === uuid
            ? {
                ...item,
                featured: data.conversation.featured,
                title: data.conversation.title,
                conversationSummary: data.conversation.conversationSummary,
              }
            : item,
        ),
      );

      // If we're in featured view and we just unfeatured a conversation, remove it from the list
      if (isFeaturedView && !data.conversation.featured) {
        setConversationItems((prevItems) =>
          prevItems.filter((item) => item.uuid !== uuid),
        );
      }
    } catch (error) {
      console.error("Error toggling featured status:", error);
    } finally {
      setTogglingFeaturedUuid(null);
    }
  };

  const handleDeleteConversation = async (uuid: string) => {
    if (user?.role !== "admin") return;

    if (
      !confirm(
        "Are you sure you want to delete this conversation? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/${uuid}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete conversation");
      }

      // Remove the conversation from the local state
      setConversationItems((prevItems) =>
        prevItems.filter((item) => item.uuid !== uuid),
      );
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert(
        `Failed to delete conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleBanUser = async (uuid: string) => {
    if (user?.role !== "admin") return;

    if (
      !confirm(
        `Are you sure you want to ban the user associated with this conversation? This will prevent them from creating new conversations.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/${uuid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Banned by admin",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to ban user");
      }

      alert("User banned successfully");
    } catch (error) {
      console.error("Error banning user:", error);
      alert(
        `Failed to ban user: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const loadMoreConversations = useCallback(async () => {
    if (loading || !pagination || pagination.page >= pagination.totalPages)
      return;

    setLoading(true);
    const nextPage = pagination.page + 1;
    await fetchConversations(nextPage);
  }, [loading, pagination, fetchConversations]);

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

  if (initialLoading || !authChecked) {
    return (
      <FullWidthPage>
        <div className="flex h-64 items-center justify-center">
          <p>Loading conversations...</p>
        </div>
      </FullWidthPage>
    );
  }

  return (
    <FullWidthPage>
      <div className="no-wrap flex h-full w-full flex-row">
        {/* Sidebar for larger screens */}
        <div
          className={`hidden h-full ${currentConversationId ? "w-md shrink-0" : "w-full max-w-lg"} border-r border-gray-200 bg-white lg:block dark:border-gray-700 dark:bg-gray-800`}
        >
          <div
            className={`h-full ${currentConversationId ? "" : "mx-auto max-w-4xl"}`}
          >
            <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
              <h2
                className={`mb-2 ${currentConversationId ? "" : "text-center"} text-xl font-bold`}
              >
                Conversations
              </h2>
              <div
                className={`flex ${currentConversationId ? "" : "justify-center"} space-x-1`}
              >
                <div className="mb-4 w-full">
                  <Tabs
                    value={isFeaturedView ? "featured" : "all"}
                    onValueChange={(value: string) => {
                      if (value === "featured") {
                        switchToFeatured();
                      } else if (value === "all") {
                        switchToAll();
                      }
                      setSidebarOpen(false);
                    }}
                    className="w-full"
                  >
                    <TabsList className="grid h-12 grid-cols-2 gap-1 rounded-xl border">
                      <TabsTrigger
                        value="featured"
                        className="flex-row items-center gap-2 rounded-lg py-2"
                      >
                        <Star className="hidden h-4 w-4 sm:block" />
                        <span className="text-sm font-medium">Featured</span>
                      </TabsTrigger>
                      {user?.role === "admin" && (
                        <TabsTrigger
                          value="all"
                          className="flex-row items-center gap-2 rounded-lg py-2"
                        >
                          <List className="hidden h-4 w-4 sm:block" />
                          <span className="text-sm font-medium">All</span>
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </div>
            {user?.role === "admin" && (
              <div
                className={`border-b border-gray-200 p-4 ${currentConversationId ? "" : "text-center"} dark:border-gray-700`}
              >
                <AdminPanel
                  onLogin={() => {
                    // Auth state will be updated by AuthInitializer
                  }}
                  onLogout={() => {
                    // Auth state will be updated by AuthInitializer
                  }}
                />
              </div>
            )}
            <div className="h-full overflow-y-auto px-4">
              <div
                className={`grid ${currentConversationId ? "grid-cols-1" : "grid-cols-1 gap-2 lg:grid-cols-1"}`}
              >
                {conversationItems.map((convo) => (
                  <ConversationCard
                    key={convo.uuid}
                    uuid={convo.uuid}
                    title={convo.title}
                    updatedAt={convo.updatedAt}
                    mode={convo.mode}
                    featured={convo.featured}
                    conversationSummary={convo.conversationSummary}
                    country={convo.country}
                    showFeaturedStar={false}
                    layout={currentConversationId ? "list" : "grid"}
                    onClick={() => handleConversationClick(convo.uuid)}
                    isActive={convo.uuid === currentConversationId}
                    isAdminUser={user?.role === "admin"}
                    onToggleFeatured={handleToggleFeatured}
                    isTogglingFeatured={togglingFeaturedUuid === convo.uuid}
                    onDeleteConversation={handleDeleteConversation}
                    onBanUser={handleBanUser}
                  >
                    {convo.messages}
                  </ConversationCard>
                ))}
              </div>
            </div>
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
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h2 className="mb-4 text-xl font-bold">Conversations</h2>
                <Tabs
                  value={isFeaturedView ? "featured" : "all"}
                  onValueChange={(value: string) => {
                    if (value === "featured") {
                      switchToFeatured();
                    } else if (value === "all") {
                      switchToAll();
                    }
                  }}
                  className="w-full"
                >
                  <TabsList className="grid h-12 grid-cols-2 gap-1 rounded-xl border">
                    <TabsTrigger
                      value="featured"
                      className="flex-row items-center gap-2 rounded-lg py-2"
                    >
                      <Star className="hidden h-4 w-4 sm:block" />
                      <span className="text-sm font-medium">Featured</span>
                    </TabsTrigger>
                    {user?.role === "admin" && (
                      <TabsTrigger
                        value="all"
                        className="flex-row items-center gap-2 rounded-lg py-2"
                      >
                        <List className="hidden h-4 w-4 sm:block" />
                        <span className="text-sm font-medium">All</span>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>
              </div>
              <div className="mb-4">
                <AdminPanel
                  onLogin={() => {
                    // Auth state will be updated by AuthInitializer
                  }}
                  onLogout={() => {
                    // Auth state will be updated by AuthInitializer
                  }}
                />
              </div>
              <div
                className={`grid ${currentConversationId ? "grid-cols-1" : "grid-cols-1 gap-2 lg:grid-cols-2"}`}
              >
                {conversationItems.map((convo) => (
                  <ConversationCard
                    key={convo.uuid}
                    uuid={convo.uuid}
                    title={convo.title}
                    updatedAt={convo.updatedAt}
                    mode={convo.mode}
                    featured={convo.featured}
                    conversationSummary={convo.conversationSummary}
                    country={convo.country}
                    showFeaturedStar={false}
                    layout="grid"
                    onClick={() => handleConversationClick(convo.uuid)}
                    isActive={convo.uuid === currentConversationId}
                    isAdminUser={user?.role === "admin"}
                    onToggleFeatured={handleToggleFeatured}
                    isTogglingFeatured={togglingFeaturedUuid === convo.uuid}
                    onDeleteConversation={handleDeleteConversation}
                    onBanUser={handleBanUser}
                  >
                    {convo.messages}
                  </ConversationCard>
                ))}
              </div>
              {pagination && pagination.page < pagination.totalPages && (
                <div ref={mobileSentinel} />
              )}
              {loading && <p className="py-4 text-center">Loading...</p>}
            </div>
          </div>
        </div>

        {/* Main content */}
        {currentConversationId && (
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
              <div className="flex items-center justify-center">
                <div className="max-w-3xl">
                  <ChatSection
                    conversationId={currentConversationId}
                    key={currentConversationId}
                    readOnly={true}
                  />
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
    </FullWidthPage>
  );
}
