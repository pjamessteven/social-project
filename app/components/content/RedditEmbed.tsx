"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "../ui/card";

export default function RedditEmbed({
  title,
  user,
  userUrl,
  sub,
  subUrl,
  url,
  imageUrl,
}: {
  title: string;
  user: string;
  sub: string;
  subUrl: string;
  url: string;
  userUrl: string;
  imageUrl?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const currentRef = imageRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    // The Card provides the border, background, and now padding.
    // Your "border-destructive" class is kept for the specific highlight effect.
    <Card
      className={
        "!border-destructive reddit-card bg-destructive/5 dark:bg-destructive/40 w-80 border transition-all duration-300"
      }
    >
      <blockquote
        className="reddit-embed-bq" // This class is ESSENTIAL for the script to find it
        data-embed-height="600"
        data-embed-parent="true"
      >
        {/* Title Section */}
        <div className="m-4 mb-2 text-lg leading-snug font-semibold md:text-xl">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-card-foreground hover:text-primary hover:underline"
          >
            {title}
          </a>
        </div>

        {imageUrl && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <div
              ref={imageRef}
              className="m-4 overflow-hidden rounded-lg"
            >
              {isVisible ? (
                <img
                  src={imageUrl}
                  alt={`Preview for ${title}`}
                  className={
                    imageAspectRatio !== null && imageAspectRatio < 1
                      ? "w-full h-full object-cover aspect-square"
                      : "w-full h-auto"
                  }
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    setImageAspectRatio(img.naturalWidth / img.naturalHeight);
                  }}
                />
              ) : (
                <div className="bg-accent w-full aspect-video animate-pulse rounded-lg" />
              )}
            </div>
          </a>
        )}

        {/* Meta Information Section */}
        <div className="text-muted-foreground m-4 text-sm">
          Posted by{" "}
          <a
            href={userUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-card-foreground hover:text-primary font-medium hover:underline"
          >
            {user}
          </a>{" "}
          in{" "}
          <a
            href={subUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-card-foreground hover:text-primary font-medium hover:underline"
          >
            r/{sub}
          </a>
        </div>
      </blockquote>
    </Card>
  );
}
