"use client";

import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
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
    <>
      <Accordion type="single" collapsible className="mt- mb-8 w-full pt-0">
        <AccordionItem
          value="disclaimer"
          className="bg-secondary mt-0 overflow-hidden rounded-xl border p-3 pt-0"
        >
          <AccordionTrigger className="-mt-8 -mb-3 w-full py-0 pt-0 text-base !font-normal hover:no-underline">
            <div className="align-center flex flex-col justify-center pt-3 text-sm">
              <div className="font-semibold">Submit Your Story</div>
              <div className="text-muted-foreground mt-1">
                Share a YouTube video about your detransition experience
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="prose-sm dark:prose-invert text-muted-foreground max-w-full text-base">
            <div className="space-y-3 pt-1">
              <p className="mt-3 border-t pt-3">
                By submitting your story it will show on this page and in
                relevant chats. <b>detrans.ai</b> uses speech-to-text to surface
                relevant videos when people ask questions. All submissions are
                moderated, it might take a few days before it's visible.
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
                    variant={
                      message.type === "error" ? "destructive" : "default"
                    }
                  >
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Submitting..." : "Submit Video"}
                </Button>
              </form>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
