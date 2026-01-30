"use client";

import { cn, slugify } from "@/app/lib/utils";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

interface ChatBubbleButtonProps {
  message: {
    display: string;
    full?: string;
  };
  isLink?: boolean;
  size?: "sm" | "md";
  className?: string;
}

function useIsRTL() {
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    const checkDirection = () => {
      setIsRTL(document.dir === "rtl");
    };
    checkDirection();
    const observer = new MutationObserver(checkDirection);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    return () => observer.disconnect();
  }, []);

  return isRTL;
}

export default function ChatBubbleButton({
  message,
  className,
  size = "md",
  isLink = false,
}: ChatBubbleButtonProps) {
  const rtl = useIsRTL();

  const button = (
    <Button
      variant="secondary"
      className={cn(
        "h-auto w-auto gap-2 rounded-xl whitespace-normal transition-colors duration-300 sm:w-auto",
        rtl
          ? "justify-end rounded-ss-none text-right"
          : "justify-start rounded-se-none text-left",
        size === "sm"
          ? "px-3 py-2 !text-sm font-normal"
          : "px-4 py-3 text-base font-medium",
        className,
        isLink === true
          ? "transition-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          : "pointer-none:",
      )}
      size={size === "sm" ? "sm" : undefined}
    >
      <div
        className={cn(
          "flex w-full items-baseline",
          rtl ? "flex-row-reverse" : "flex-row",
        )}
      >
        <div>
          {isLink && (
            <span className="whitespace-nowrap">
              {rtl ? "<-" : "->"}&nbsp;&nbsp;
            </span>
          )}
        </div>
        <div className="line-clamp-6">{message.display}</div>
      </div>
    </Button>
  );

  if (isLink) {
    return (
      <Link
        prefetch={false}
        href={"/chat/?starter=" + slugify(message.full || message.display)}
        className="w-full no-underline sm:w-auto"
      >
        {button}
      </Link>
    );
  }

  return button;
}
