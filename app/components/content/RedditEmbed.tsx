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
  title:string;
  user: string;
  sub: string;
  subUrl: string;
  url: string;
  userUrl: string;
  imageUrl?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
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
        "border-destructive reddit-card min-w-md border transition-all duration-300"
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
              className="m-4 aspect-video overflow-hidden rounded-lg"
            >
              {isVisible ? (
                <img
                  src={imageUrl}
                  alt={`Preview for ${title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-accent" />
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
