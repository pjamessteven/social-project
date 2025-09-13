/* counter that will cause donation message to show after X requests */

import { useCallback, useEffect, useState } from "react";

const KEY = "requestCount";
const KEY_DATE = "requestDate";

const LIMIT = 10; // quota before seeing donation message

export default function useRequestCounter() {
  const [count, setCount] = useState<number>(0);

  // read once on mount (client only)
  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    setCount(stored ? parseInt(stored, 10) : 0);
  }, []);

  // increment and persist - memoized to prevent recreation
  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      window.localStorage.setItem(KEY, String(next));
      return next;
    });
  }, []);

  // reset (optional)
  const reset = useCallback(() => {
    setCount(0);
    window.localStorage.removeItem(KEY);
  }, []);

  return {
    count,
    increment,
    reset,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - count),
  };
}
