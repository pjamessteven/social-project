"use client";
import { slugify } from "@/app/lib/utils";
import { Send } from "lucide-react";
import { redirect, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { cn } from "../lib/utils";
interface CustomChatInputProps {
  placeholder: string;
  mode: "detrans" | "affirm" | "compare";
}

export function CustomChatInput({ placeholder, mode }: CustomChatInputProps) {
  const pathname = usePathname();
  const showChatInput = pathname == "/" || pathname.includes("/chat");

  if (!showChatInput) {
    return <></>;
  }

  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      const val = value.trim();
      setValue("");
      if (mode == "compare") {
        redirect("/compare/chat/" + slugify(val));
      } else if (mode == "affirm") {
        redirect("/affirm/chat/" + slugify(val));
      } else {
        redirect("/chat/" + slugify(val));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={cn(
        "sticky bottom-0 z-50 w-full p-4 shadow-sm backdrop-blur-md",
        "supports-[backdrop-filter]:bg-black/5 dark:supports-[backdrop-filter]:bg-gray-900/80",
        mode === "affirm" &&
          "bg-gradient-to-r from-[#5BCEFA]/20 via-[#FFFFFF]/20 to-[#F5A9B8]/20 dark:bg-gradient-to-r dark:from-[#5BCEFA]/20 dark:via-[#2D2D2D]/20 dark:to-[#F5A9B8]/20",
      )}
    >
      <div className="flex items-center justify-center">
        <form onSubmit={handleSubmit} className="flex w-3xl items-center gap-2">
          <div className="relative flex-1 grow">
            <Input
              size="lg"
              className="!placeholder-opacity-100 flex grow rounded-full bg-white pr-2 shadow-sm dark:border dark:border-white/10 dark:bg-gray-800 dark:placeholder-white dark:placeholder:text-white"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="h-14 w-14 flex-shrink-0 rounded-full"
            disabled={!value.trim()}
          >
            <Send className="h-6 w-6" />
          </Button>
        </form>
      </div>
    </div>
  );
}
