"use client";
import { slugify } from "@/app/lib/utils";
import { Send } from "lucide-react";
import { redirect, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { cn } from "../lib/utils";
import Link from "next/link";
interface CustomChatInputProps {
  host: string;
}

export function CustomChatInput({ host }: CustomChatInputProps) {
  const path = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const showChatInput =
    path == "/" ||
    path == "/compare" ||
    path == "/affirm" ||
    path.includes("/chat");

  const mode =
    host.includes("genderaffirming.ai") || path.includes("/affirm")
      ? "affirm"
      : path.includes("/compare")
        ? "compare"
        : "detrans";

  const placeholder =
    mode === "detrans"
      ? "Ask 50,000+ detransitioners..."
      : mode === "compare"
        ? "Compare trans and detrans perspectives"
        : "Ask 600,000+ trans people";

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.matchMedia('(min-width: 768px) and (pointer: fine)').matches);
    };
    
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // Fetch suggestions when value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/questions/top?mode=${mode}&q=${encodeURIComponent(value.trim())}&limit=5`
        );
        const data = await response.json();
        
        if (data.items) {
          setSuggestions(data.items.map((item: any) => item.page));
          setShowSuggestions(true);
          setSelectedSuggestion(-1);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value, mode]);

  useEffect(() => {
    if (isDesktop && showChatInput && inputRef.current) {
      // Small delay to ensure DOM is ready after navigation
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isDesktop, showChatInput, path]);

  // Handle click outside to hide suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  if (!showChatInput) {
    return <></>;
  }
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
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }
      
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
        return;
      }
      
      if (e.key === "Tab" && selectedSuggestion >= 0) {
        e.preventDefault();
        setValue(suggestions[selectedSuggestion]);
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        return;
      }
      
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showSuggestions && selectedSuggestion >= 0) {
        setValue(suggestions[selectedSuggestion]);
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
      } else {
        handleSubmit(e);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (value.trim().length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 z-50 w-full p-4 shadow-lg backdrop-blur-lg",
        "supports-[backdrop-filter]:bg-accent/70 dark:supports-[backdrop-filter]:bg-gray-900/80",
        mode === "affirm" &&
          "bg-gradient-to-r from-[#5BCEFA]/20 via-[#FFFFFF]/20 to-[#F5A9B8]/20 dark:bg-gradient-to-r dark:from-[#5BCEFA]/20 dark:via-[#2D2D2D]/20 dark:to-[#F5A9B8]/20",
      )}
    >
      <div className="z-10 flex items-center justify-center">
        <form onSubmit={handleSubmit} className="flex w-3xl items-center gap-2">
          <div ref={containerRef} className="relative flex-1 grow">
            <Input
              ref={inputRef}
              style={{
                boxShadow: "rgba(0, 0, 0, 0.2) 0px 18px 50px -10px",
              }}
              size="lg"
              className="!placeholder-opacity-100 relative flex grow z-20 rounded-full bg-white pr-2 shadow-sm dark:border dark:border-white/10 dark:bg-gray-800 dark:placeholder-white dark:placeholder:text-white"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder={placeholder}
            />
            
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 pb-16 z-0 overflow-y-auto rounded-[32px] rounded-br-[32px]  border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 backdrop-filter backdrop-blur-lg animate-in fade-in-0 duration-200">
                <div className="px-5 pt-4 pb-2 font-semibold">Suggestions:</div>
                {suggestions.map((question, index) => (
                <Link onClick={() => setShowSuggestions(false)}
                  prefetch={false}
                  href={
                    mode === "detrans"
                      ? "/chat/" + slugify(question)
                      : mode === "affirm"
                        ? "/affirm/chat/" + slugify(question)
                        : "/compare/chat/" + slugify(question)
                  }
                  key={index}
                >
                  <div className={`flex flex-row items-center pt-2 pl-3 pb-2 hover:bg-secondary ${index < suggestions.length - 1 ? 'border-b' : ''}`}>
                    <div className="text-muted-foreground hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-lg italic opacity-90">
                      <div className="mr-2 whitespace-nowrap">{"->"}</div>
                      <div>{question}</div>
                    </div>
                  </div>
                </Link>
                ))}
              </div>
            )}
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
