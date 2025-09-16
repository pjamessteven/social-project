/* components/RedditEmbed.tsx */
"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Card } from "../ui/card";

type Props = {
  title: string;
  user: string;
  sub: string;
  url: string;
  userUrl: string;
  subUrl: string;
  lazy?: boolean;
  theme?: "dark" | "light";
  showMedia?: boolean;
  depth?: 1 | 2;
};

export default function RedditEmbed(props: Props) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "200px" });
  const [showIframe, setShowIframe] = useState(!props.lazy);

  useEffect(() => {
    if (props.lazy && inView) setShowIframe(true);
  }, [inView, props.lazy]);

  return (
    <Card
      ref={ref}
      className="border-destructive reddit-card min-w-md border transition-all duration-300"
    >
      {showIframe ? <Iframe {...props} /> : <Placeholder {...props} />}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 1.  Static placeholder (exactly what you already had)              */
/* ------------------------------------------------------------------ */
function Placeholder({ title, user, sub, url, userUrl, subUrl }: Props) {
  return (
    <blockquote className="reddit-embed-bq" data-embed-height="600">
      <div className="m-4 mb-2 text-lg font-semibold md:text-xl">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          {title}
        </a>
      </div>
      <div className="text-muted-foreground m-4 text-sm">
        Posted by{" "}
        <a
          href={userUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          {user}
        </a>{" "}
        in{" "}
        <a
          href={subUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          r/{sub}
        </a>
      </div>
    </blockquote>
  );
}

/* ------------------------------------------------------------------ */
/* 2.  Single isolated embed (reddit script sees ONLY this link)      */
/* ------------------------------------------------------------------ */
function Iframe({ url, theme, showMedia, depth }: Props) {
  const mount = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mount.current) return;

    /* ---- build the link the Reddit script expects ---- */
    const a = document.createElement("a");
    a.href = url;
    a.className = "reddit-embed";
    if (theme) a.setAttribute("data-embed-theme", theme);
    a.setAttribute("data-embed-showmedia", String(showMedia));
    a.setAttribute("data-embed-depth", String(depth));

    /* ---- sandbox: detached div so script can’t see the rest of page ---- */
    const sandbox = document.createElement("div");
    sandbox.style.display = "none";
    document.body.appendChild(sandbox);
    sandbox.appendChild(a);

    /* ---- load script inside sandbox ---- */
    const s = document.createElement("script");
    s.src = "https://embed.reddit.com/widgets.js";
    sandbox.appendChild(s);

    /* ---- move finished iframe back to React tree ---- */
    const poll = setInterval(() => {
      const iframe = sandbox.querySelector("iframe");
      if (iframe) {
        clearInterval(poll);
        mount.current!.appendChild(iframe); // put it where React wants it
        document.body.removeChild(sandbox); // clean up
      }
    }, 50);

    return () => {
      clearInterval(poll);
      if (sandbox.parentNode) document.body.removeChild(sandbox);
    };
  }, [url, theme, showMedia, depth]);

  return <div ref={mount} />;
}
