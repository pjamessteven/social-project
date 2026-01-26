"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function VideoSubmitForm() {
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
          text: "Video submitted successfully! It will be reviewed before appearing on the site.",
        });
        setUrl("");
        setSex("f");
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to submit video",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-muted-foreground">
      <details className="mb-4 cursor-pointer">
        <summary className="text-muted-foreground">
          Submit Your Detransition Video
        </summary>
        <div className="space-y-3 pt-1">
          <p className="mt-3 border-t pt-3">
            By submitting your video it will show on this page and in relevant
            chats.
            <br className="hidden md:inline" /> It could be your video, or it
            could just be one you found online that's missing from this page.
            <br className="hidden md:inline" /> All submissions are moderated,
            it might take a few days before it appears.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm">
                YouTube URL
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
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
              {isSubmitting ? "Submitting..." : "Submit Video"}
            </Button>
          </form>
        </div>
      </details>
    </div>
  );
}
