// hooks/useRateLimit.ts
import { useEffect, useState } from "react";

export function useRateLimit() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => {
    // Read the headers from the *current* document fetch
    const remainingHdr = document.head
      .querySelector('meta[name="x-ratelimit-remaining"]')
      ?.getAttribute("content");
    const limitHdr = document.head
      .querySelector('meta[name="x-ratelimit-limit"]')
      ?.getAttribute("content");

    if (remainingHdr) setRemaining(Number(remainingHdr));
    if (limitHdr) setLimit(Number(limitHdr));
  }, []);

  return { remaining, limit };
}
