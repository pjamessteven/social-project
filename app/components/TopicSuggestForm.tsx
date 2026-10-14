"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useCaptcha } from "@/app/hooks/useCaptcha";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { HCaptchaDialog } from "./ui/hcaptcha-dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const EMPTY_FORM = { topic: "", details: "", email: "", site: "" };

export default function TopicSuggestForm() {
  const t = useTranslations("topicSuggestForm");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Captcha state management
  const { showCaptchaDialog, setShowCaptchaDialog, verifyCaptcha } =
    useCaptcha();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Returns true when the server asked for a captcha instead of sending.
  const send = async (): Promise<boolean> => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/topics/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (response.status === 402 && data.requiresCaptcha) {
        return true;
      }
      if (response.ok && data.success) {
        setMessage({ type: "success", text: t("submitSuccess") });
        setForm(EMPTY_FORM);
      } else {
        // The API's error text is English-only; show the translated one.
        setMessage({ type: "error", text: t("submitError") });
      }
    } catch {
      setMessage({ type: "error", text: t("networkError") });
    } finally {
      setIsSubmitting(false);
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send()) setShowCaptchaDialog(true);
  };

  const handleCaptchaVerify = async (token: string) => {
    const result = await verifyCaptcha(token);

    if (result.success) {
      setShowCaptchaDialog(false);
      // Retry submission after successful captcha verification
      await send();
    }
  };

  return (
    <div className="text-muted-foreground not-prose mb-10 max-w-3xl">
      <details className="cursor-pointer">
        <summary className="text-muted-foreground">{t("submitTitle")}</summary>
        <div className="space-y-3 pt-1">
          <p className="mt-3 border-t pt-3">{t("description")}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic-suggest-topic" className="text-sm">
                {t("topicLabel")}
              </Label>
              <Input
                id="topic-suggest-topic"
                name="topic"
                type="text"
                placeholder={t("topicPlaceholder")}
                value={form.topic}
                onChange={handleChange}
                maxLength={300}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic-suggest-details" className="text-sm">
                {t("detailsLabel")}
              </Label>
              <Textarea
                id="topic-suggest-details"
                name="details"
                placeholder={t("detailsPlaceholder")}
                value={form.details}
                onChange={handleChange}
                maxLength={5000}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic-suggest-email" className="text-sm">
                {t("emailLabel")}
              </Label>
              <Input
                id="topic-suggest-email"
                name="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={form.email}
                onChange={handleChange}
              />
              <p className="text-muted-foreground text-xs">{t("emailHelp")}</p>
            </div>

            <div className="hidden" aria-hidden="true">
              <label htmlFor="topic-suggest-site">Leave this field empty</label>
              <input
                id="topic-suggest-site"
                name="site"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.site}
                onChange={handleChange}
              />
            </div>

            {message && (
              <Alert
                variant={message.type === "error" ? "destructive" : "default"}
              >
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("submitButton")}
            </Button>
          </form>
        </div>
      </details>

      {/* hCaptcha Dialog */}
      <HCaptchaDialog
        isOpen={showCaptchaDialog}
        onClose={() => setShowCaptchaDialog(false)}
        onVerify={handleCaptchaVerify}
        siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
      />
    </div>
  );
}
