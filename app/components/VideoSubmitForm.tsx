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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

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
      <Accordion type="single" collapsible className="mt- mt-8 mb-8 pt-0 w-full">
        <AccordionItem
          value="disclaimer"
          className="overflow-hidden rounded-xl border pt-0 mt-0 p-3 bg-secondary"
        >
          <AccordionTrigger className="w-full text-base !font-normal  hover:no-underline py-0 -mt-8  -mb-3 pt-0">
            <div className="flex flex-col text-sm">
              <div>Submit Video</div>
              <div className="text-muted-foreground mt-1">
                Share a YouTube video about transition or detransition
                experiences
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="prose dark:prose-invert max-w-full text-base text-muted-foreground">
            <div className="space-y-3">
              <p className="mt-6 pt-0 text-sm">
                By submitting your story it will show on this page and in
                relevant chats. <b>detrans.ai</b> uses speech-to-text to surface
                relevant videos when people ask questions. All submissions are moderated, it might take a few days before it's visible. 
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm">YouTube URL</Label>
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
