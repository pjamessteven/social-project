"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { uuidv4 } from "@/app/lib/utils";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const newConversationId = uuidv4();
    router.replace(`/chat/${newConversationId}`);
  }, [router]);

  return null;
}
