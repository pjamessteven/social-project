"use client";

import { useEffect, useRef } from "react";

/**
 * Records one view of a wiki page from the browser, so link prefetches and
 * crawlers that don't run JS aren't counted. Renders nothing.
 */
export function WikiViewTracker({ pageId }: { pageId: number }) {
  const sent = useRef<number | null>(null);

  useEffect(() => {
    if (sent.current === pageId) return;
    sent.current = pageId;
    fetch("/api/pages/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pageId }),
      keepalive: true,
    }).catch(() => {});
  }, [pageId]);

  return null;
}
