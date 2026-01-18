"use client";

import { formatCountryDisplay } from "@/app/lib/countries";
import { formatDate } from "@/app/lib/utils";
import { Ban, Clock, MoreVertical, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { ReactNode, useState } from "react";
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
  onDeleteConversation?: (uuid: string) => Promise<void>;
  onBanUser?: (uuid: string) => Promise<void>;
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
  onDeleteConversation,
  onBanUser,
}: ConversationCardProps) {
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
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
            ? "hover-group dark:bg-secondary block rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:bg-gray-100"
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
                  <>
                    <Star
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isTogglingFeatured && onToggleFeatured) {
                          onToggleFeatured(uuid, featured);
                        }
                      }}
                      className={`h-4 w-4 shrink-0 ${
                        featured
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAdminMenu(!showAdminMenu);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>

                      {showAdminMenu && (
                        <div className="absolute top-full right-0 z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (onDeleteConversation && !isDeleting) {
                                setIsDeleting(true);
                                try {
                                  await onDeleteConversation(uuid);
                                } finally {
                                  setIsDeleting(false);
                                  setShowAdminMenu(false);
                                }
                              }
                            }}
                            disabled={isDeleting}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {isDeleting ? "Deleting..." : "Delete Conversation"}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (onBanUser && !isBanning) {
                                setIsBanning(true);
                                try {
                                  await onBanUser(uuid);
                                } finally {
                                  setIsBanning(false);
                                  setShowAdminMenu(false);
                                }
                              }
                            }}
                            disabled={isBanning}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Ban className="h-4 w-4" />
                            {isBanning ? "Banning..." : "Ban User (IP)"}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>{formatDate(updatedAt)}</span>
                {layout === "grid" && " from "}
                {layout === "grid" && (
                  <span>{formatCountryDisplay(country || "")}</span>
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
            className={`dark:border-muted-foreground/30 dark:from-secondary-foreground/10 from-secondary/50 text-muted-foreground bg-gradient-to- borde mt-0 border-b to-transparent pb-2 text-sm ${
              layout === "grid" ? "line-clamp-6" : "line-clamp-6"
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
              className="dark:bg-secondary-foreground bg-primary text-secondary dark:text-secondary pointer-events-none max-w-full"
            ></ChatBubbleButton>
          ))}
          {userMessages.length > 3 && (
            <ChatBubbleButton
              size="sm"
              className="dark:text-muted-foreground text-muted-foreground mt- pointer-events-none -mr-3 -mb-2 bg-transparent !text-xs"
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
      <div className="-mt-3 -mb-1 hidden w-full">
        <div className="tl-xl h-4 w-full rounded-br-2xl rounded-bl-2xl border-r border-b border-l opacity-80" />
        <div className="tl-xl -mt-3 h-4 w-full rounded-br-2xl rounded-bl-2xl border-r border-b border-l opacity-60" />
        <div className="tl-xl -mt-3 h-4 w-full rounded-br-2xl rounded-bl-2xl border-r border-b border-l opacity-40" />
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
