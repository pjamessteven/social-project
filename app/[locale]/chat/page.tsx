"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { uuidv4 } from "@/app/lib/utils";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // One id per visit, and redirect only once: a re-run of the effect (Strict
  // Mode, a new searchParams identity) must not mint a second conversation
  // and mount the chat twice with the same ?starter=.
  const [newConversationId] = useState(uuidv4);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    const queryString = searchParams.toString();
    const newUrl = `/chat/${newConversationId}${queryString ? `?${queryString}` : ''}`;
    router.replace(newUrl);
  }, [router, searchParams, newConversationId]);

  return null;
}
