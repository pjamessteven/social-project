"use client";

import { useMainStore } from "@/stores/main-store";

export default function CheckerboardBg() {
  const scrollPosition = useMainStore((s) => s.scrollPosition);
  const opacity = Math.max(0, 1 - scrollPosition / 400);

  return (
    <div
      className="text-foreground checkerboard-bg pointer-events-none fixed inset-0 z-0 -mt-[400px] -ml-[400px] h-[800px] overflow-hidden"
      style={{ opacity }}
    />
  );
}
