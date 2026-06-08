"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function XCard() {
  const t = useTranslations("home.xCard");
  return (
    <a
      href="https://x.com/DetransAI"
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline"
    >
      <Card className="group bg-card relative cursor-pointer overflow-hidden rounded-xl border-blue-400/50 bg-blue-300/20 shadow-none shadow-sm transition-all duration-500 hover:brightness-110 dark:border-blue-400/30 dark:bg-blue-400/20">
        <div className="pointer-events-none absolute inset-0 left-0 w-[300%] translate-x-[-100%] bg-gradient-to-r from-white/20 via-white/10 to-transparent transition-transform duration-500 ease-in-out group-hover:translate-x-[0%] dark:via-white/10" />
        <CardHeader className="z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <XIcon className="text-foreground mr-2 h-5 w-5" />
              <CardTitle className="text-foreground dark:text-white">
                {t("title")}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <ChevronRight className="h-4 min-w-4 text-blue-600/80" />
            </div>
          </div>
          <CardDescription className="z-10 mt-2">
            {t("description")}
          </CardDescription>
        </CardHeader>
      </Card>
    </a>
  );
}
