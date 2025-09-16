// components/RedditEmbed.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "../ui/card";

type Props = {
  title: string;
  user: string;
  sub: string;
  url: string; // full reddit permalink  e.g.  https://www.reddit.com/r/nextjs/comments/abc123/…
  userUrl: string;
  subUrl: string;
  lazy?: boolean; // opt-in to viewport-based iframe
  theme?: "dark" | "light";
  showMedia?: boolean;
  depth?: 1 | 2;
};

export default function RedditEmbed({
  title,
  user,
  sub,
  url,
  userUrl,
  subUrl,
  lazy = false,
  theme,
  showMedia = true,
  depth = 1,
}: Props) {
  const placeholderRef = useRef<HTMLQuoteElement | HTMLDivElement | null>(null);
  const [upgraded, setUpgraded] = useState(!lazy); // instantly upgrade when lazy=false

  useEffect(() => {
    if (!lazy || upgraded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setUpgraded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (placeholderRef.current) {
      observer.observe(placeholderRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, upgraded]);

  useEffect(() => {
    if (!lazy || !upgraded) return;

    // 1. Build the official reddit embed link
    const a = document.createElement("a");
    a.href = url;
    a.className = "reddit-embed";
    if (theme) a.setAttribute("data-embed-theme", theme);
    a.setAttribute("data-embed-showmedia", String(showMedia));
    a.setAttribute("data-embed-depth", String(depth));

    // 2. Replace placeholder with that link
    placeholderRef.current!.innerHTML = "";
    placeholderRef.current!.appendChild(a);

    // 3. Re-run the bootstrap so the new link is picked up
    const s = document.createElement("script");
    s.src = "https://embed.reddit.com/widgets.js";
    s.async = true;
    document.body.appendChild(s);

    return () => s.remove();
  }, [lazy, upgraded, url, theme, showMedia, depth]);

  /* ------------------------------------------------------------------ */
  /*  Static placeholder (what you already had)                         */
  /* ------------------------------------------------------------------ */
  const Placeholder = () => (
    <Card className="border-destructive reddit-card min-w-md border transition-all duration-300">
      <blockquote
        className="reddit-embed-bq"
        data-embed-height="600"
        data-embed-parent="true"
        ref={placeholderRef}
      >
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

  /* ------------------------------------------------------------------ */
  /*  After upgrade we just keep the Card shell and let the iframe live */
  /*  inside it.                                                        */
  /* ------------------------------------------------------------------ */
  return upgraded ? (
    <Card className="border-destructive reddit-card min-w-md border transition-all duration-300">
      <div ref={placeholderRef} />
    </Card>
  ) : (
    <Placeholder />
  );
}
