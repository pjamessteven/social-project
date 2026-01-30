import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uuidv4(): string {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
    ).toString(16),
  );
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

export function formatDate(
  dateString: string,
  locale: string = "en-US",
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  }
}

export async function toggleFeaturedAPI(
  uuid: string,
  currentFeatured: boolean,
) {
  const response = await fetch(`/api/chat/${uuid}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      featured: !currentFeatured,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to toggle featured status");
  }

  return await response.json();
}
