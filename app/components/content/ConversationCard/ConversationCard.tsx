"use client";

import { formatCountryDisplay } from "@/app/lib/countries";
import { formatDate } from "@/app/lib/utils";
import { Clock, Star } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import ChatBubbleButton from "../ChatBubbleButton";
export interface ConversationCardProps {
  uuid: string;
  title: string | null;
  updatedAt: string;
  mode: string;
  featured: boolean;
  conversationSummary: string | null;
  country: string | null;
  showFeaturedStar?: boolean;
  layout?: "grid" | "list";
  children?: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  isAdminUser?: boolean;
  onToggleFeatured?: (uuid: string, currentFeatured: boolean) => Promise<void>;
  isTogglingFeatured?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (uuid: string, currentFavorited: boolean) => Promise<void>;
  isTogglingFavorite?: boolean;
}

export function ConversationCard({
  uuid,
  title,
  updatedAt,
  mode,
  featured,
  conversationSummary,
  country,
  showFeaturedStar = true,
  layout = "grid",
  children,
  onClick,
  isActive = false,
  isAdminUser = false,
  onToggleFeatured,
  isTogglingFeatured = false,
  isFavorited = false,
  onToggleFavorite,
  isTogglingFavorite = false,
}: ConversationCardProps) {
  // Parse messages to extract user messages for summary fallback
  let userMessages: string[] = [];
  if (children) {
    try {
      // If children is a string of JSON messages, parse it
      if (typeof children === "string") {
        const parsedMessages = JSON.parse(children);
        if (Array.isArray(parsedMessages)) {
          userMessages = parsedMessages
            .filter(
              (msg: any) =>
                msg.role === "user" &&
                Array.isArray(msg.parts) &&
                msg.parts[0]?.type === "text",
            )
            .map((msg: any) => msg.parts[0].text);
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  const content = (
    <>
      <div
        className={`${
          layout === "grid"
            ? "hover-group dark:bg-secondary block rounded-xl border bg-white p-4 shadow-sm transition-colors hover:bg-gray-100"
            : `block w-full rounded-md p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isActive
                  ? "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : ""
              }`
        }`}
      >
        <div className="mb-2 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div
              className={`${
                layout === "grid"
                  ? "mb-2 flex items-start justify-between gap-2"
                  : "flex items-center justify-between"
              }`}
            >
              <h4
                className={`${
                  layout === "grid"
                    ? "hover-group:text-white dark:hover-group:text-black line-clamp-2 flex-1 font-medium"
                    : "line-clamp-2 text-sm font-semibold"
                }`}
              >
                {title || "Untitled Conversation"}
              </h4>
              <div className="flex items-center gap-2">
                {!isAdminUser && showFeaturedStar && featured && (
                  <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                )}
                {isAdminUser && (
                  <Star
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isTogglingFavorite && onToggleFavorite) {
                        onToggleFavorite(uuid, isFavorited);
                      }
                    }}
                    className={`h-4 w-4 shrink-0 ${
                      isFavorited
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-400"
                    }`}
                  />
                )}
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>{formatDate(updatedAt)}</span>
                {layout === "grid" && " from "}
                {country &&
                  country !== "Unknown" &&
                  country !== "Local" &&
                  layout === "grid" && (
                    <span>{formatCountryDisplay(country)}</span>
                  )}
                {layout === "list" && country && (
                  <>
                    <span className="mx-1">•</span>
                    <span>{formatCountryDisplay(country)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {conversationSummary && (
          <div
            className={`dark:border-muted-foreground/30 dark:from-secondary-foreground/5 from-secondary/50 text-muted-foreground mt-4 rounded-tl-xl border-t border-l bg-gradient-to-b to-transparent pt-2 pr-2 pl-3 text-sm ${
              layout === "grid" ? "" : "line-clamp-6"
            }`}
          >
            {conversationSummary}
          </div>
        )}

        <div className="mt-4 flex flex-col items-end justify-end space-y-2">
          {userMessages.slice(0, 3).map((message, index) => (
            <ChatBubbleButton
              size="sm"
              key={index}
              message={{ display: message }}
              className="dark:bg-secondary-foreground dark:text-secondary max-w-full text-gray-700"
            ></ChatBubbleButton>
          ))}
          {userMessages.length > 3 && (
            <ChatBubbleButton
              size="sm"
              className="dark:text-muted-foreground text-muted-foreground mt- -mr-3 -mb-2 bg-transparent !text-xs"
              message={{
                display:
                  userMessages.length - 3 > 1
                    ? userMessages.length - 3 + " more messages..."
                    : userMessages.length + " more message...",
              }}
            ></ChatBubbleButton>
          )}
        </div>
      </div>
      <div className="-mt-2 -mb-1 hidden w-full lg:block">
        <div className="tl-xl h-4 w-full rounded-br-2xl rounded-bl-2xl border-r border-b border-l opacity-80" />
        <div className="tl-xl -mt-2 h-4 w-full rounded-br-2xl rounded-bl-2xl border-r border-b border-l opacity-60" />
        <div className="tl-xl -mt-2 h-4 w-full rounded-br-2xl rounded-bl-2xl border-r border-b border-l opacity-40" />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link href={`/chat/${uuid}`} className="block">
      {content}
    </Link>
  );
}
