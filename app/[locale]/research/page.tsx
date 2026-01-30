"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to a default deep research question or show an input
    // For now, redirect to a placeholder that tells users to enter a question
    const starterParam = searchParams.get("starter");
    if (starterParam) {
      // If there's a starter param, redirect to that question
      router.replace(`/research/${starterParam}`);
    }
    // Otherwise, stay on this page - the CustomChatInput will handle new questions
  }, [router, searchParams]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Deep Research</h1>
        <p className="text-muted-foreground">
          Enter a question below to start your research
        </p>
      </div>
    </div>
  );
}
