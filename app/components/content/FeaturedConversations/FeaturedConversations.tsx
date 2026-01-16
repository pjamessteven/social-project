"use client";

import { cn, toggleFeaturedAPI } from "@/app/lib/utils";
import { useUserStore } from "@/stores/user-store";
import { History, List, Loader2, MessageSquare, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { ConversationCard } from "../ConversationCard/ConversationCard";
import { ConversationDialog } from "../ConversationDialog/ConversationDialog";

interface FeaturedConversation {
  uuid: string;
  title: string | null;
  updatedAt: string;
  mode: string;
  messages: string;
  featured: boolean;
  conversationSummary: string | null;
  country: string | null; // Country from IP geolocation
}

// Custom hook to detect medium screens (md: 768px and larger)
function useIsMediumScreen() {
  const [isMediumScreen, setIsMediumScreen] = useState<boolean | undefined>(
    undefined,
  );

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      setIsMediumScreen(window.innerWidth >= 768);
    };
    mql.addEventListener("change", onChange);
    setIsMediumScreen(window.innerWidth >= 768);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMediumScreen;
}

export function FeaturedConversations() {
  const { isAuthenticated, user } = useUserStore();
  const [conversations, setConversations] = useState<FeaturedConversation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<"featured" | "all">("featured");
  const [showAllMobile, setShowAllMobile] = useState(false);
  const [togglingFeaturedUuid, setTogglingFeaturedUuid] = useState<
    string | null
  >(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const isMediumScreen = useIsMediumScreen();

  const handleToggleFeatured = async (
    uuid: string,
    currentFeatured: boolean,
  ) => {
    if (user?.role !== "admin") return;

    setTogglingFeaturedUuid(uuid);
    try {
      const data = await toggleFeaturedAPI(uuid, currentFeatured);

      // Update the conversation in the local state
      setConversations((prevConversations) =>
        prevConversations.map((convo) =>
          convo.uuid === uuid
            ? {
                ...convo,
                featured: data.conversation.featured,
                title: data.conversation.title,
                conversationSummary: data.conversation.conversationSummary,
              }
            : convo,
        ),
      );

      // If we're in featured view and we just unfeatured a conversation, remove it from the list
      if (currentTab === "featured" && !data.conversation.featured) {
        setConversations((prevConversations) =>
          prevConversations.filter((convo) => convo.uuid !== uuid),
        );
      }
    } catch (error) {
      console.error("Error toggling featured status:", error);
    } finally {
      setTogglingFeaturedUuid(null);
    }
  };

  // Generate random heights for loading skeletons between h-32 and h-80
  const generateRandomHeights = (count: number): string[] => {
    const heights = [];
    for (let i = 0; i < count; i++) {
      // Generate random number between 32 and 80 (inclusive)
      const randomHeight = Math.floor(Math.random() * (80 - 32 + 1)) + 32;
      heights.push(`h-${randomHeight}`);
    }

    return heights;
  };

  // Generate 1-3 chat bubbles with text loading lines
  const renderChatBubbles = (keyPrefix: string) => {
    const bubbleCount = Math.floor(Math.random() * 3) + 1;
    return (
      <div className="mb-4 space-y-3">
        {[...Array(bubbleCount)].map((_, bubbleIndex) => (
          <div key={`${keyPrefix}-bubble-${bubbleIndex}`} className="flex">
            {/* Chat bubble with rounded-tr-none style */}
            <div className="flex-1 rounded-xl rounded-tr-none border bg-gray-100 p-3">
              {/* Text loading lines within bubble */}
              <div className="space-y-2">
                {[...Array(Math.floor(Math.random() * 3) + 1)].map(
                  (_, lineIndex) => (
                    <div
                      key={`${keyPrefix}-bubble-line-${bubbleIndex}-${lineIndex}`}
                      className={cn(
                        "bg-gray-300",
                        lineIndex === 0
                          ? "h-3 w-full"
                          : lineIndex === 1
                            ? "h-3 w-5/6"
                            : "h-3 w-4/6",
                      )}
                    ></div>
                  ),
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const fetchConversations = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const isFeatured = currentTab === "featured";
      // Use limit=12 for medium screens and larger, limit=8 for smaller screens
      const limit = isMediumScreen ? 12 : 8;
      const response = await fetch(
        `/api/chat?featured=${isFeatured}&limit=${limit}&page=${page}`,
      );

      if (!response.ok) {
        if (response.status === 403) {
          // If unauthorized for all conversations, fall back to featured
          if (!isFeatured) {
            setCurrentTab("featured");
            setError("Showing featured conversations only");
            return;
          }
        }
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "API Response for tab",
        currentTab,
        "featured=",
        isFeatured,
        "URL:",
        `/api/chat?featured=${isFeatured}&limit=${limit}&page=${page}`,
        "Response:",
        data,
      );
      console.log("Number of items:", data.items?.length || 0);
      if (data.items && data.items.length > 0) {
        console.log("First item featured value:", data.items[0].featured);
        console.log(
          "All items featured values:",
          data.items.map((item: any) => item.featured),
        );
      }

      if (append) {
        setConversations((prev) => [...prev, ...data.items]);
      } else {
        setConversations(data.items || []);
      }

      setPagination(data.pagination || null);
      setError(null);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load conversations",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchConversations(1);
    setShowAllMobile(false); // Reset show all state when tab changes
    setLoadingMore(false); // Reset loading more state when tab changes
  }, [currentTab, isMediumScreen]);

  const handleLoadMore = () => {
    if (!loadingMore && pagination) {
      const currentPage = pagination.page;
      const totalPages =
        typeof pagination.totalPages === "string"
          ? parseInt(pagination.totalPages, 10)
          : pagination.totalPages;

      if (currentPage < totalPages) {
        fetchConversations(currentPage + 1, true);
      }
    }
  };

  // Helper to get total as number for comparison
  const getTotalAsNumber = (total: number | string): number => {
    return typeof total === "string" ? parseInt(total, 10) : total;
  };

  return (
    <div className="relative mb-8">
      <div className="bg-secondary/50 dark:bg-secondary/60 absolute -left-full z-0 h-full w-[10000px] border-t border-b" />
      <div className="relative z-20 py-8 lg:-mx-48 lg:px-8 lg:py-8">
        <Tabs
          value={currentTab}
          onValueChange={(value: string) =>
            setCurrentTab(value as "featured" | "all")
          }
          className="w-full"
        >
          <div className="lg:no-wrap mb-4 flex w-full flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="lg:prose-base prose dark:prose-invert flex flex-col">
              <div className="mt-2 flex items-center justify-start gap-2">
                <History className="mx-2 h-6 w-6 text-black dark:text-white" />

                <h3 className="my-0! py-0! text-xl font-bold">
                  Recent Conversations
                </h3>
              </div>
              <div className="mt-2 mb-6 text-gray-500">
                See for yourself how detrans.ai is helping people from around
                the world.
              </div>
            </div>
            <TabsList className="mb-4 grid h-12 grid-cols-2 gap-1 rounded-xl border lg:mb-0 lg:w-1/3">
              <TabsTrigger
                value="featured"
                className="flex-row items-center gap-2 rounded-lg py-2"
              >
                <Star className="hidden h-4 w-4 sm:block" />
                <span className="text-sm font-medium">Featured</span>
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="flex-row items-center gap-2 rounded-lg py-2"
              >
                <List className="hidden h-4 w-4 sm:block" />
                <span className="text-sm font-medium">All</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {loading ? (
            <>
              {/* Mobile loading skeletons - single column */}
              <div className="flex flex-col sm:hidden">
                {[...Array(4)].map((_, i) => {
                  const randomHeights = generateRandomHeights(4);

                  return (
                    <div
                      key={`mobile-${i}`}
                      className="mb-3 break-inside-avoid"
                    >
                      <div
                        className={cn(
                          "animate-pulse rounded-xl border p-4",
                          randomHeights[i],
                        )}
                      >
                        {/* Title loading line */}
                        <div className="mb-4 h-4 w-3/4 rounded bg-gray-200"></div>

                        {/* Chat bubbles section */}
                        {renderChatBubbles(`mobile-${i}`)}

                        {/* Footer loading lines */}
                        <div className="mb-3 h-2 w-1/2 rounded bg-gray-600"></div>
                        <div className="mb-2 h-2 w-full rounded bg-gray-600"></div>
                        <div className="mb-2 h-2 w-full rounded bg-gray-600"></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop loading skeletons - responsive columns */}
              <div className="hidden grid-cols-1 gap-3 sm:grid sm:grid-cols-2 md:mt-8 md:grid-cols-3">
                {/* First column loading skeletons */}
                <div className="flex flex-col">
                  {[...Array(4)].map((_, i) => {
                    const randomHeights = generateRandomHeights(4);

                    return (
                      <div key={`col1-${i}`} className="break-inside-avoid">
                        <div
                          className={cn(
                            "flex h-full flex-col",
                            i <= 1 && "mb-3",
                          )}
                        >
                          <div
                            className={cn(
                              "animate-pulse rounded-xl border p-4",
                              randomHeights[i],
                            )}
                          >
                            {/* Title loading line */}
                            <div className="mb-4 h-4 w-3/4 rounded bg-gray-200"></div>

                            {/* Chat bubbles section */}
                            {renderChatBubbles(`col1-${i}`)}

                            {/* Footer loading lines */}
                            <div className="mb-3 h-2 w-1/2 rounded bg-gray-600"></div>
                            <div className="mb-2 h-2 w-full rounded bg-gray-600"></div>
                            <div className="mb-2 h-2 w-full rounded bg-gray-600"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Second column loading skeletons */}
                <div className="flex flex-col">
                  {[...Array(4)].map((_, i) => {
                    const randomHeights = generateRandomHeights(4);

                    return (
                      <div key={`col2-${i}`} className="break-inside-avoid">
                        <div
                          className={cn(
                            "flex h-full flex-col",
                            i <= 1 && "mb-3",
                          )}
                        >
                          <div
                            className={cn(
                              "animate-pulse rounded-xl border p-4",
                              randomHeights[i],
                            )}
                          >
                            {/* Title loading line */}
                            <div className="mb-4 h-4 w-3/4 rounded bg-gray-200"></div>

                            {/* Chat bubbles section */}
                            {renderChatBubbles(`col2-${i}`)}

                            {/* Footer loading lines */}
                            <div className="mb-3 h-2 w-1/2 rounded bg-gray-600"></div>
                            <div className="mb-2 h-2 w-full rounded bg-gray-600"></div>
                            <div className="mb-2 h-2 w-full rounded bg-gray-600"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Third column loading skeletons - only for medium+ screens */}
                {isMediumScreen && (
                  <div className="flex flex-col">
                    {[...Array(4)].map((_, i) => {
                      const randomHeights = generateRandomHeights(4);

                      return (
                        <div key={`col3-${i}`} className="break-inside-avoid">
                          <div
                            className={cn(
                              "flex h-full flex-col",
                              i <= 1 && "mb-3",
                            )}
                          >
                            <div
                              className={cn(
                                "animate-pulse rounded-xl border p-4",
                                randomHeights[i],
                              )}
                            >
                              {/* Title loading line */}
                              <div className="mb-4 h-4 w-3/4 rounded bg-gray-200"></div>

                              {/* Chat bubbles section */}
                              {renderChatBubbles(`col3-${i}`)}

                              {/* Footer loading lines */}
                              <div className="mb-3 h-2 w-1/2 rounded bg-gray-600"></div>
                              <div className="mb-2 h-2 w-full rounded bg-gray-600"></div>
                              <div className="mb-2 h-2 w-full rounded bg-gray-600"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">
                Error loading conversations: {error}
              </p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-lg border p-6 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-gray-500">
                {currentTab === "featured"
                  ? "No featured conversations yet"
                  : "No conversations found"}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {currentTab === "featured"
                  ? "Check back later for highlighted conversations"
                  : "Try viewing featured conversations instead"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Single column */}
              <div className="flex flex-col sm:hidden">
                {conversations.map((convo, index) => (
                  <div
                    key={convo.uuid}
                    className={`break-inside-avoid ${
                      !showAllMobile && index >= 4 ? "hidden" : ""
                    }`}
                  >
                    <div className="mb-3 flex h-full flex-col">
                      <ConversationCard
                        uuid={convo.uuid}
                        title={convo.title}
                        updatedAt={convo.updatedAt}
                        mode={convo.mode}
                        featured={convo.featured}
                        conversationSummary={convo.conversationSummary}
                        country={convo.country}
                        showFeaturedStar={true}
                        layout="grid"
                        onClick={() => {
                          setSelectedConversationId(convo.uuid);
                          setDialogOpen(true);
                        }}
                        isAdminUser={user?.role === "admin"}
                        onToggleFeatured={handleToggleFeatured}
                        isTogglingFeatured={togglingFeaturedUuid === convo.uuid}
                      >
                        {convo.messages}
                      </ConversationCard>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Responsive columns */}
              <div className="hidden grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:mt-8 lg:grid-cols-3 lg:gap-4">
                {/* First column - indices 0, 3, 6, ... */}
                <div className="flex flex-col">
                  {conversations
                    .filter((_, index) => index % 3 === 0)
                    .map((convo, filteredIndex, filteredArray) => (
                      <div key={convo.uuid} className="break-inside-avoid">
                        <div
                          className={cn(
                            "flex h-full flex-col",
                            filteredIndex <= filteredArray.length / 2 &&
                              "mb-3 lg:mb-4",
                          )}
                        >
                          <ConversationCard
                            uuid={convo.uuid}
                            title={convo.title}
                            updatedAt={convo.updatedAt}
                            mode={convo.mode}
                            featured={convo.featured}
                            conversationSummary={convo.conversationSummary}
                            country={convo.country}
                            showFeaturedStar={true}
                            layout="grid"
                            onClick={() => {
                              setSelectedConversationId(convo.uuid);
                              setDialogOpen(true);
                            }}
                            isAdminUser={user?.role === "admin"}
                            onToggleFeatured={handleToggleFeatured}
                            isTogglingFeatured={
                              togglingFeaturedUuid === convo.uuid
                            }
                          >
                            {convo.messages}
                          </ConversationCard>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Second column - indices 1, 4, 7, ... */}
                <div className="flex flex-col">
                  {conversations
                    .filter((_, index) => index % 3 === 1)
                    .map((convo, filteredIndex, filteredArray) => (
                      <div key={convo.uuid} className="break-inside-avoid">
                        <div
                          className={cn(
                            "flex h-full flex-col",
                            filteredIndex <= filteredArray.length / 2 &&
                              "mb-3 lg:mb-4",
                          )}
                        >
                          <ConversationCard
                            uuid={convo.uuid}
                            title={convo.title}
                            updatedAt={convo.updatedAt}
                            mode={convo.mode}
                            featured={convo.featured}
                            conversationSummary={convo.conversationSummary}
                            country={convo.country}
                            showFeaturedStar={true}
                            layout="grid"
                            onClick={() => {
                              setSelectedConversationId(convo.uuid);
                              setDialogOpen(true);
                            }}
                            isAdminUser={user?.role === "admin"}
                            onToggleFeatured={handleToggleFeatured}
                            isTogglingFeatured={
                              togglingFeaturedUuid === convo.uuid
                            }
                          >
                            {convo.messages}
                          </ConversationCard>
                        </div>
                      </div>
                    ))}{" "}
                </div>

                {/* Third column - indices 2, 5, 8, ... */}
                <div className="flex flex-col">
                  {conversations
                    .filter((_, index) => index % 3 === 2)
                    .map((convo, filteredIndex, filteredArray) => (
                      <div key={convo.uuid} className="break-inside-avoid">
                        <div
                          className={cn(
                            "flex h-full flex-col",
                            filteredIndex <= filteredArray.length / 2 &&
                              "mb-3 lg:mb-4",
                          )}
                        >
                          <ConversationCard
                            uuid={convo.uuid}
                            title={convo.title}
                            updatedAt={convo.updatedAt}
                            mode={convo.mode}
                            featured={convo.featured}
                            conversationSummary={convo.conversationSummary}
                            country={convo.country}
                            showFeaturedStar={true}
                            layout="grid"
                            onClick={() => {
                              setSelectedConversationId(convo.uuid);
                              setDialogOpen(true);
                            }}
                            isAdminUser={user?.role === "admin"}
                            onToggleFeatured={handleToggleFeatured}
                            isTogglingFeatured={
                              togglingFeaturedUuid === convo.uuid
                            }
                          >
                            {convo.messages}
                          </ConversationCard>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              {/* Combined mobile button - shows more OR loads more */}
              {(() => {
                // Check if we should show any mobile button
                const shouldShowButton =
                  (!showAllMobile && conversations.length > 4) ||
                  (pagination &&
                    (() => {
                      const currentPage = pagination.page;
                      const totalPages =
                        typeof pagination.totalPages === "string"
                          ? parseInt(pagination.totalPages, 10)
                          : pagination.totalPages;
                      return currentPage < totalPages;
                    })());

                return shouldShowButton ? (
                  <div className="mt-4 block sm:hidden">
                    {!showAllMobile && conversations.length > 4 ? (
                      <button
                        onClick={() => setShowAllMobile(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Show {conversations.length - 4} More Conversations
                      </button>
                    ) : (
                      pagination &&
                      (() => {
                        const currentPage = pagination.page;
                        const totalPages =
                          typeof pagination.totalPages === "string"
                            ? parseInt(pagination.totalPages, 10)
                            : pagination.totalPages;

                        return currentPage < totalPages ? (
                          <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                          >
                            {loadingMore ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-4 w-4" />
                                Load More Conversations
                              </>
                            )}
                          </button>
                        ) : null;
                      })()
                    )}
                  </div>
                ) : null;
              })()}

              {/* Show Less button for mobile when showing all */}
              {conversations.length > 4 && showAllMobile && (
                <div className="mt-4 block sm:hidden">
                  <button
                    onClick={() => setShowAllMobile(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Show Less
                  </button>
                </div>
              )}

              {/* Load More button for desktop */}
              {pagination &&
                (() => {
                  const currentPage = pagination.page;
                  const totalPages =
                    typeof pagination.totalPages === "string"
                      ? parseInt(pagination.totalPages, 10)
                      : pagination.totalPages;

                  return currentPage < totalPages ? (
                    <div className="mt-8 hidden w-full items-center justify-center sm:flex md:mt-12">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="dark:text-primary dark:bg-secondary dark:border-muted-foreground/20 flex w-full max-w-[740px] items-center justify-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-4 w-4" />
                            Load More Conversations
                          </>
                        )}
                      </button>
                    </div>
                  ) : null;
                })()}
            </>
          )}
        </Tabs>

        {/* Conversation Dialog */}
        <ConversationDialog
          conversationId={selectedConversationId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={
            selectedConversationId
              ? conversations.find((c) => c.uuid === selectedConversationId)
                  ?.title || "Conversation"
              : "Conversation"
          }
          updatedAt={
            selectedConversationId
              ? conversations.find((c) => c.uuid === selectedConversationId)
                  ?.updatedAt
              : undefined
          }
          country={
            selectedConversationId
              ? conversations.find((c) => c.uuid === selectedConversationId)
                  ?.country
              : undefined
          }
          conversationSummary={
            selectedConversationId
              ? conversations.find((c) => c.uuid === selectedConversationId)
                  ?.conversationSummary
              : undefined
          }
        />
      </div>
    </div>
  );
}
