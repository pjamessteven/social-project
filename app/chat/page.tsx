"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { uuidv4 } from "@/app/lib/utils";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const newConversationId = uuidv4();
    const currentParams = new URLSearchParams(searchParams.toString());
    const queryString = currentParams.toString();
    const newUrl = `/chat/${newConversationId}${queryString ? `?${queryString}` : ''}`;
    router.replace(newUrl);
  }, [router, searchParams]);

  return null;
}
