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
    <div
      className={`${
        layout === "grid"
          ? "hover-group dark:bg-secondary block rounded-xl border p-4 shadow-sm transition-colors hover:bg-gray-100"
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
              {showFeaturedStar && featured && (
                <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
              )}
              {isAdminUser && onToggleFeatured && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isTogglingFeatured) {
                      onToggleFeatured(uuid, featured);
                    }
                  }}
                  disabled={isTogglingFeatured}
                  className={`ml-2 flex items-center gap-1 rounded px-3 py-1 text-xl ${
                    featured
                      ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                  } ${isTogglingFeatured ? "cursor-not-allowed opacity-50" : ""}`}
                  title={
                    isTogglingFeatured
                      ? "Updating..."
                      : featured
                        ? "Unfeature this conversation"
                        : "Feature this conversation"
                  }
                >
                  {featured ? "★" : "☆"}
                </button>
              )}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
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
        <p
          className={`mt-2 ${
            layout === "grid"
              ? "dark:text-muted-foreground text-sm text-gray-600"
              : "dark:text-muted-foreground line-clamp-6 text-sm text-gray-600"
          }`}
        >
          {conversationSummary}
        </p>
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
