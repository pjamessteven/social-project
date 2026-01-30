"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function VideoSubmitForm() {
  const t = useTranslations("videoSubmitForm");
  const [url, setUrl] = useState("");
  const [sex, setSex] = useState<"m" | "f" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/videos/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, sex }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: t("submitSuccess"),
        });
        setUrl("");
        setSex("f");
      } else {
        setMessage({
          type: "error",
          text: data.error || t("submitError"),
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: t("networkError") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-muted-foreground">
      <details className="mb-4 cursor-pointer">
        <summary className="text-muted-foreground">
          {t("submitTitle")}
        </summary>
        <div className="space-y-3 pt-1">
          <p className="mt-3 border-t pt-3">
            {t("description.line1")}
            <br className="hidden md:inline" /> {t("description.line2")}
            <br className="hidden md:inline" /> {t("description.line3")}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm">
                {t("urlLabel")}
              </Label>
              <Input
                id="url"
                type="url"
                placeholder={t("urlPlaceholder")}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            {message && (
              <Alert
                variant={message.type === "error" ? "destructive" : "default"}
              >
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-">
              {isSubmitting ? t("submitting") : t("submitButton")}
            </Button>
          </form>
        </div>
      </details>
    </div>
  );
}
