"use client";
import { slugify } from "@/app/lib/utils";
import { Send, X, NotebookPen } from "lucide-react";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { cn } from "../lib/utils";
import Link from "next/link";

interface CustomChatInputProps {
  host: string;
  chatHandler?: {
    sendMessage: (message: { text: string }) => void;
  };
}

export function CustomChatInput({ host, chatHandler }: CustomChatInputProps) {
  const path = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [isDeepResearch, setIsDeepResearch] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const showChatInput =
    path == "/" ||
    path == "/compare" ||
    path == "/affirm" ||
    path.includes("/research");

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
      setShowSuggestions(false);
      
      if (isDeepResearch) {
        // Deep research mode - redirect to research routes
        if (mode == "compare") {
          redirect("/compare/research/" + slugify(val));
        } else if (mode == "affirm") {
          redirect("/affirm/research/" + slugify(val));
        } else {
          redirect("/research/" + slugify(val));
        }
      } else {
        // Chat mode - use chat handler or navigate to chat
        if (chatHandler && path === "/chat") {
          // We're on chat page and have handler, send message directly
          chatHandler.sendMessage({ text: val });
        } else {
          // Navigate to chat page
          router.push("/chat");
          // Store the message to send after navigation
          sessionStorage.setItem("pendingChatMessage", val);
        }
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

  const handleClear = () => {
    setShowSuggestions(false);
    setValue("");
    setSelectedSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleClickSuggestion =() => {
    setShowSuggestions(false)
    setValue("")
  }

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
              className="!placeholder-opacity-100 relative flex grow z-20 rounded-full bg-white pr-20 shadow-sm dark:border dark:border-white/10 dark:bg-gray-800 dark:placeholder-white dark:placeholder:text-white"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder={placeholder}
            />
            
            {/* Deep research toggle button */}
            <button
              type="button"
              onClick={() => setIsDeepResearch(!isDeepResearch)}
              className={cn(
                "absolute right-10 top-1/2 -translate-y-1/2 z-30 p-1 rounded-full transition-colors",
                isDeepResearch 
                  ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800" 
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
              title={isDeepResearch ? "Deep Research Mode (Active)" : "Deep Research Mode (Inactive)"}
            >
              <NotebookPen className="h-4 w-4" />
            </button>

            {/* Clear button */}
            {value.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 pb-16 z-0 overflow-y-auto rounded-[32px] rounded-br-[32px]  border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 backdrop-filter backdrop-blur-lg animate-in fade-in-0 fade-out-0 duration-300">
                <div className="px-5 pt-4 pb-2 font-semibold">Suggestions:</div>
                {suggestions.map((question, index) => (
                <Link onClick={handleClickSuggestion}
                  prefetch={false}
                  href={
                    mode === "detrans"
                      ? "/research/" + slugify(question)
                      : mode === "affirm"
                        ? "/affirm/research/" + slugify(question)
                        : "/compare/research/" + slugify(question)
                  }
                  key={index}
                >
                  <div className={`flex flex-row items-center pt-2 px-3 pb-2 hover:bg-secondary ${index < suggestions.length - 1 ? 'border-b' : ''}`}>
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start text-sm sm:text-lg italic opacity-90 min-w-0 flex-1">
                      <div className="mr-2 whitespace-nowrap">{"->"}</div>
                      <div className="pr-2 truncate">{question}</div>
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
