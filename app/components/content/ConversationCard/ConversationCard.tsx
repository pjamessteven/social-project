"use client";

import { formatCountryDisplay } from "@/app/lib/countries";
import { Ban, Clock, MoreVertical, Star, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ReactNode, useState } from "react";
import ChatBubbleButton from "../ChatBubbleButton";
export interface ConversationCardProps {
  uuid: string;
  title: string | null;
  updatedAt: string;
  mode: string;
  featured: boolean;
  conversationSummary: string | null;
  conversationSummaryTranslation: string | null;
  titleTranslation: string | null;
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
  conversationSummaryTranslation,
  titleTranslation,
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
  const t = useTranslations("conversationCard");
  const locale = useLocale();
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // Get localized conversation summary
  const getLocalizedSummary = (): string | null => {
    if (!conversationSummaryTranslation) return conversationSummary;
    
    try {
      const translations = JSON.parse(conversationSummaryTranslation) as Record<string, string>;
      return translations[locale] || conversationSummary;
    } catch {
      return conversationSummary;
    }
  };

  const localizedSummary = getLocalizedSummary();

  // Get localized title
  const getLocalizedTitle = (): string | null => {
    if (!titleTranslation) return title;
    
    try {
      const translations = JSON.parse(titleTranslation) as Record<string, string>;
      return translations[locale] || title;
    } catch {
      return title;
    }
  };

  const localizedTitle = getLocalizedTitle();

  // Format relative date using translations
  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t("date.today");
    } else if (diffDays === 1) {
      return t("date.yesterday");
    } else if (diffDays < 7) {
      return t("date.daysAgo", { count: diffDays });
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return t("date.weeksAgo", { count: weeks });
    } else {
      return date.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      });
    }
  };
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
                {localizedTitle || t("untitled")}
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
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAdminMenu(!showAdminMenu);
                        }}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </div>

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
                            {isDeleting
                              ? t("admin.deleting")
                              : t("admin.delete")}
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
                            {isBanning ? t("admin.banning") : t("admin.ban")}
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
                <span>{formatRelativeDate(updatedAt)}</span>
                {layout === "grid" && <span> {t("from")} </span>}
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

        {localizedSummary && (
          <div
            className={`dark:border-muted-foreground/30 dark:from-secondary-foreground/10 from-secondary/50 text-muted-foreground bg-gradient-to- borde mt-0 border-b to-transparent pb-2 text-sm ${
              layout === "grid" ? "" : ""
            }`}
          >
            {localizedSummary}
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
                    ? t("moreMessages", { count: userMessages.length - 3 })
                    : t("moreMessage", { count: userMessages.length }),
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
      <div onClick={onClick} className="w-full cursor-pointer text-left">
        {content}
      </div>
    );
  }

  return (
    <Link href={`/chat/${uuid}` as any} className="block">
      {content}
    </Link>
  );
}
