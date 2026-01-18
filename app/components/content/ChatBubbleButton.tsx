import { cn, slugify } from "@/app/lib/utils";
import Link from "next/link";
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

export default function ChatBubbleButton({
  message,
  className,
  size = "md",
  isLink = false,
}: ChatBubbleButtonProps) {
  const button = (
    <Button
      variant="secondary"
      className={cn(
        "h-auto w-auto justify-start gap-2 rounded-xl rounded-tr-none text-left whitespace-normal transition-colors duration-300 sm:w-auto",
        size === "sm"
          ? "px-3 py-2 !text-sm font-normal"
          : "px-4 py-3 text-base font-medium",
        className,
        isLink === true
          ? "hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          : "pointer-none:",
      )}
      size={size === "sm" ? "sm" : undefined}
    >
      <div className="flex w-full items-baseline">
        <div>{isLink && <span>{"->"}&nbsp;&nbsp;</span>}</div>
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
