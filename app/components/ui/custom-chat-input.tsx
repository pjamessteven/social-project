"use client";
import { slugify } from "@/app/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { Send, Square, UserSearch, X } from "lucide-react";
import Link from "next/link";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { cn } from "./lib/utils";
import { Textarea } from "./textarea";

interface CustomChatInputProps {
  host: string;
}

export function CustomChatInput({ host }: CustomChatInputProps) {
  const path = usePathname();
  const router = useRouter();
  const {
    chatHandler,
    sendMessage,
    chatStatus,
    isDeepResearch,
    setIsDeepResearch,
    setChatStatus,
  } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    path.includes("/chat") ||
    path.includes("/research");

  const mode =
    host.includes("genderaffirming.ai") || path.includes("/affirm")
      ? "affirm"
      : path.includes("/compare")
        ? "compare"
        : "detrans";

  const placeholder =
    mode === "detrans"
      ? "Ask detrans.ai..."
      : mode === "compare"
        ? "Compare trans and detrans perspectives"
        : "Ask 600,000+ trans people";

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(
        window.matchMedia("(min-width: 768px) and (pointer: fine)").matches,
      );
    };

    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  // Update deep research state based on current path
  useEffect(() => {
    // require user manually selects this mode in order to save costs
    //  setIsDeepResearch(path.includes("/research"));
  }, [path, setIsDeepResearch]);

  /*
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
          `/api/questions/top?mode=${mode}&q=${encodeURIComponent(value.trim())}&limit=5`,
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

*/
  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Calculate the new height (max 6 lines)
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const maxHeight = lineHeight * 6;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);

    textarea.style.height = `${newHeight}px`;
  }, [value]);

  useEffect(() => {
    if (isDesktop && showChatInput && textareaRef.current) {
      // Small delay to ensure DOM is ready after navigation
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }

    // add padding to the bottom of the main scroll container to account for chat input height
    const container = document.querySelector("main");
    if (!container) return;

    if (showChatInput) {
      container.classList.add("pb-24");
    } else {
      container.classList.remove("pb-24");
    }
  }, [isDesktop, showChatInput, path]);

  // Handle click outside to hide suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
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

      if (isDeepResearch || path.includes("/compare") || mode === "affirm") {
        // Deep research mode - redirect to research routes
        if (path.includes("compare")) {
          redirect("/compare/research/" + slugify(val));
        } else if (mode == "affirm") {
          redirect("/affirm/research/" + slugify(val));
        } else {
          redirect("/research/" + slugify(val));
        }
      } else {
        // Chat mode - use chat handler or navigate to chat
        if (chatHandler && path.includes("/chat")) {
          // We're on chat page and have handler, send message directly
          sendMessage(val);
        } else {
          // Navigate to chat page
          router.push("/chat?starter=" + slugify(val));
          // Store the message to send after navigation
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
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

    // Submit on Enter without Shift
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
    textareaRef.current?.focus();
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
    textareaRef.current?.focus();
  };

  const handleClickSuggestion = () => {
    setShowSuggestions(false);
    setValue("");
  };

  const showDeepResearch = !path.includes("/compare") && mode !== "affirm";

  return (
    <div
      style={{
        boxShadow:
          " rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px",
      }}
      className={cn(
        "fixed bottom-0 z-50 w-full border-t border-white p-4 backdrop-blur-lg dark:border-white/5",
        "supports-[backdrop-filter]:bg-accent/80 dark:supports-[backdrop-filter]:bg-gray-900/80",
        mode === "affirm" &&
          "bg-gradient-to-r from-[#5BCEFA]/20 via-[#FFFFFF]/20 to-[#F5A9B8]/20 dark:bg-gradient-to-r dark:from-[#5BCEFA]/20 dark:via-[#2D2D2D]/20 dark:to-[#F5A9B8]/20",
      )}
    >
      <div className="z-10 flex items-center justify-center">
        <form onSubmit={handleSubmit} className="flex w-3xl items-center gap-2">
          <div ref={containerRef} className="relative flex-1 grow">
            <Textarea
              ref={textareaRef}
              style={{
                boxShadow: "rgba(0, 0, 0, 0.2) 0px 18px 50px -10px",
              }}
              className={cn(
                "!placeholder-opacity-100 border-slate relative z-20 flex max-h-48 min-h-12 w-full cursor-text resize-none overflow-hidden rounded-2xl bg-white py-4 pl-4 shadow-sm disabled:cursor-default sm:pr-40 dark:border dark:border-white/10 dark:bg-gray-800 dark:placeholder-white dark:placeholder:text-white",
                value.length === 0 ? "pr-32" : "pr-16",
              )}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder={placeholder}
              disabled={chatStatus !== "ready"}
              rows={1}
            />

            {/* Deep research toggle button */}
            {showDeepResearch && (
              <Button
                variant="chatOutline"
                type="button"
                onClick={() => setIsDeepResearch(!isDeepResearch)}
                size={"xs"}
                className={cn(
                  "absolute top-1/2 right-3 z-30 -translate-y-1/2 rounded-xl px-0 py-0 transition-colors",
                  isDeepResearch
                    ? "border-blue-300 bg-blue-100 !text-blue-400 hover:bg-blue-200 dark:border-blue-900 dark:bg-blue-900 dark:text-blue-400 hover:dark:bg-blue-800"
                    : "text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 hover:dark:bg-gray-600",
                )}
              >
                <div className="flex flex-row items-center px-3 text-xs">
                  {value.length === 0 && (
                    <div className="mr-2 flex flex-row">
                      <span className="hidden sm:inline">Deep&nbsp;</span>
                      Research
                    </div>
                  )}
                  <UserSearch className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </Button>
            )}
            {/* Clear button */}
            {value.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-3 right-3 z-30 hidden rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="animate-in fade-in-0 fade-out-0 absolute right-0 bottom-full left-0 z-0 mb-2 overflow-y-auto rounded-[32px] rounded-br-[32px] border bg-white pb-4 shadow-xl backdrop-blur-lg backdrop-filter duration-300 dark:border-slate-700 dark:bg-slate-800">
                <div className="px-5 pt-4 pb-2 font-semibold">Suggestions:</div>
                {suggestions.map((question, index) => (
                  <Link
                    onClick={handleClickSuggestion}
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
                    <div
                      className={`hover:bg-secondary flex flex-row items-center px-3 pt-2 pb-2 ${index < suggestions.length - 1 ? "border-b" : ""}`}
                    >
                      <div className="text-muted-foreground hover:text-primary flex min-w-0 flex-1 cursor-pointer flex-row items-start text-sm italic opacity-90 sm:text-lg">
                        <div className="mr-2 whitespace-nowrap">{"->"}</div>
                        <div className="truncate pr-2">{question}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Button
            type={chatStatus === "streaming" ? "button" : "submit"}
            size="icon"
            className="h-14 w-14 flex-shrink-0 rounded-full"
            onClick={
              chatStatus !== "ready" && chatHandler?.stop
                ? chatHandler.stop
                : undefined
            }
          >
            {chatStatus !== "ready" ? (
              <Square className="h-5 w-5" />
            ) : (
              <Send className="h-6 w-6" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
