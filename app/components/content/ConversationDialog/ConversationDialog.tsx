"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { formatCountryDisplay } from "@/app/lib/countries";
import { formatDate } from "@/app/lib/utils";
import { ReadingDialog } from "../../ui/reading-dialog";

// Dynamically import ChatSection to avoid loading it until needed
const ChatSection = dynamic(
  () => import("@/app/components/ui/chat/chat-section"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    ),
  },
);

interface ConversationDialogProps {
  conversationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  updatedAt?: string;
  country?: string | null;
  conversationSummary?: string | null;
  conversationSummaryTranslation?: string | null;
  includeTransPerspectives?: boolean | null;
}

export function ConversationDialog({
  conversationId,
  open,
  onOpenChange,
  title,
  updatedAt,
  country,
  conversationSummary,
  conversationSummaryTranslation,
  includeTransPerspectives,
}: ConversationDialogProps) {
  const locale = useLocale();
  const t = useTranslations("chat");
  const tDialog = useTranslations("conversationCard.dialog");
  const tCard = useTranslations("conversationCard");
  const [isLoading, setIsLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(open);
  const [showId, setShowId] = useState(false);
  const [localizedSummary, setLocalizedSummary] = useState<string | null>(null);

  // Get localized summary based on current locale
  useEffect(() => {
    if (!conversationSummaryTranslation) {
      setLocalizedSummary(conversationSummary ?? null);
      return;
    }

    try {
      const translations = JSON.parse(conversationSummaryTranslation) as Record<
        string,
        string
      >;
      setLocalizedSummary(translations[locale] || conversationSummary || null);
    } catch {
      setLocalizedSummary(conversationSummary ?? null);
    }
  }, [conversationSummary, conversationSummaryTranslation, locale]);

  // Sync internal state with props
  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    onOpenChange(newOpen);
  };

  // Show loading state when conversationId changes while dialog is open
  useEffect(() => {
    if (open && conversationId) {
      setIsLoading(true);
      // Small delay to show loading state
      const timer = setTimeout(() => setIsLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [conversationId, open]);

  return (
    <ReadingDialog
      open={internalOpen}
      onOpenChange={handleOpenChange}
      title={title || tDialog("title")}
      meta={
        (updatedAt || country || conversationId) && (
          // Clickable to toggle between date/country and ID
          <div
            onClick={() => setShowId(!showId)}
            className="text-muted-foreground cursor-pointer text-sm select-text hover:text-gray-700"
            title={tDialog("toggleIdHint")}
          >
            {showId && conversationId ? (
              <span className="font-mono">{conversationId}</span>
            ) : (
              <>
                {updatedAt && <span>{formatDate(updatedAt)}</span>}
                {country &&
                  country !== "Unknown" &&
                  country !== "Local" && (
                    <span>
                      &nbsp;{tCard("from")}&nbsp;{formatCountryDisplay(country)}
                    </span>
                  )}
              </>
            )}
          </div>
        )
      }
      share={
        conversationId
          ? {
              url: () => `${window.location.origin}/chat/${conversationId}`,
              title: title || tDialog("title"),
              text: tDialog("shareText"),
            }
          : null
      }
      labels={{
        share: tDialog("share"),
        copyLink: tDialog("copyLink"),
      }}
    >
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
        </div>
      ) : conversationId ? (
        <div className="h-full overflow-y-auto pb-4">
          {localizedSummary && (
            <div className="text-muted-foreground bg-primary-foreground px-4 pb-4">
              {localizedSummary}
            </div>
          )}
          {includeTransPerspectives && (
            <div className="text-muted-foreground bg-primary-foreground px-4 pb-4 text-xs">
              🏳️‍⚧️ {t("transPerspectivesIncluded")}
            </div>
          )}
          <div className="bg-background border-primary sticky top-0 z-20 h-px w-full border-t" />
          <div className="px-4 pt-6 sm:px-0">
            <ChatSection
              conversationId={conversationId}
              readOnly={true}
              key={conversationId} // Force re-render when conversationId changes
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">{tDialog("noneSelected")}</p>
        </div>
      )}
    </ReadingDialog>
  );
}
