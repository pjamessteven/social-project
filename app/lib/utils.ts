import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(question: string): string {
  return encodeURIComponent(question.trim().toLowerCase().replace(/\s+/g, "-"));
}

export function deslugify(slug?: string): string {
  if (slug) {
    return decodeURIComponent(slug)
      .replace(/--/g, "\x00") // temporary sentinel
      .replace(/-/g, " ")
      .replace(/\x00/g, "-")
      .trim();
  } else {
    return "";
  }
}

export function capitaliseWords(str?: string) {
  if (str) {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } else {
    return "";
  }
}

export function capitaliseFirstWord(str?: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function markdownToPlainText(md?: string) {
  if (md) {
    return md
      .replace(/!\[.*?\]\(.*?\)/g, "") // remove images
      .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // convert links to text
      .replace(/[`*_>~#-]/g, "") // remove markdown symbols
      .replace(/\n+/g, "\n") // collapse multiple newlines
      .trim();
  } else {
    return "";
  }
}
