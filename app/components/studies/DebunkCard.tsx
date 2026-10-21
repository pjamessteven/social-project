"use client";

import { MAX_MESSAGE_LENGTH } from "@/app/lib/constants";
import { setPendingMessage } from "@/app/lib/pending-message";
import { uuidv4 } from "@/app/lib/utils";
import { useRouter } from "@/i18n/routing";
import { ArrowRight, MessageSquareReply } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, KeyboardEvent, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

/**
 * "Countering misinformation online?" card on the studies page: paste a
 * comment, and a new chat opens with a preset request to rebut it from the
 * studies archive. The exact comment text is handed over via
 * `setPendingMessage` (not the URL), so case, punctuation and line breaks
 * survive the trip.
 */
export default function DebunkCard() {
  const t = useTranslations("studiesPage.debunk");
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The server truncates messages at MAX_MESSAGE_LENGTH, so the comment is
  // capped to what fits after the preset instructions
  const maxCommentLength = Math.max(
    200,
    MAX_MESSAGE_LENGTH - t("prompt", { comment: "" }).length,
  );

  const submit = () => {
    const text = comment.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    const conversationId = uuidv4();
    setPendingMessage(conversationId, t("prompt", { comment: text }));
    router.push({
      pathname: "/chat/[uuid]",
      params: { uuid: conversationId },
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  // Enter sends, Shift+Enter adds a line break (like the chat input)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Card className="relative overflow-hidden rounded-xl border border-sky-300/70 bg-sky-100/40 dark:border-sky-900/60 dark:bg-sky-950/40">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MessageSquareReply className="text-foreground mr-2 h-5 w-5 shrink-0" />
          <CardTitle className="text-foreground dark:text-white">
            {t("title")}
          </CardTitle>
        </div>
        <CardDescription className="mt-2">{t("description")}</CardDescription>
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="sr-only" htmlFor="debunk-comment">
            {t("placeholder")}
          </label>
          <textarea
            id="debunk-comment"
            name="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            maxLength={maxCommentLength}
            rows={1}
            disabled={submitting}
            className="bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 field-sizing-content max-h-60 min-h-[46px] w-full grow resize-none rounded-3xl border px-5 py-2.5 text-base outline-none focus-visible:ring-[3px] disabled:opacity-60"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!comment.trim() || submitting}
            className="h-[46px] shrink-0 gap-1.5 self-end rounded-full px-4 sm:self-auto"
          >
            {t("button")}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          </Button>
        </form>
      </CardHeader>
    </Card>
  );
}
