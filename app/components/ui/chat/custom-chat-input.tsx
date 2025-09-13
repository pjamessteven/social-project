"use client";
import { slugify } from "@/app/lib/utils";
import { Send } from "lucide-react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { cn } from "../lib/utils";
interface CustomChatInputProps {
  placeholder: string;
  mode: "detrans" | "affirm" | "compare";
}

export function CustomChatInput({ placeholder, mode }: CustomChatInputProps) {
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
        "fixed bottom-0 left-0 w-full p-4 backdrop-blur",
        "supports-[backdrop-filter]:bg-transparent/60 dark:supports-[backdrop-filter]:bg-transparent",
      )}
    >
      <div className="flex items-center justify-center">
        <form onSubmit={handleSubmit} className="flex w-3xl items-center gap-2">
          <div className="relative flex-1 grow">
            <Input
              size="lg"
              className="flex grow rounded-full bg-white/80 pr-12 dark:bg-gray-700/80"
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
