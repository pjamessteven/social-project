"use client";

import { useEffect } from "react";
import { useUserStore } from "@/stores/user-store";

export function AuthInitializer() {
  const { checkAuth } = useUserStore();

  useEffect(() => {
    // Check authentication status when component mounts
    checkAuth();
  }, [checkAuth]);

  // This component doesn't render anything
  return null;
}
