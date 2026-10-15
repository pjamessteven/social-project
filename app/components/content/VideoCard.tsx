import {
  CARD_INTERACTIVE,
  CARD_SURFACE,
} from "@/app/components/ui/card-styles";
import { getYouTubeVideoId } from "@/app/lib/video-utils";
import { Link } from "@/i18n/routing";
import type { ReactNode } from "react";

interface VideoCardProps {
  /** Locale-less path, e.g. "/videos/123-title" (the Link adds the locale). */
  href: string;
  videoUrl: string;
  title: string;
  thumbnailAlt: string;
  summary?: string | null;
  /** e.g. "by Jane (Female)" */
  byline: ReactNode;
  /** Heading level for the title, to fit the surrounding page outline. */
  titleAs?: "h2" | "h3";
}

/**
 * A video as a card: full-width thumbnail on top, then title, summary and
 * byline, on the shared card surface. Works in server and client components.
 */
export function VideoCard({
  href,
  videoUrl,
  title,
  thumbnailAlt,
  summary,
  byline,
  titleAs: Title = "h3",
}: VideoCardProps) {
  return (
    <Link
      href={href as any}
      className={`group flex h-full flex-col overflow-hidden no-underline ${CARD_SURFACE} ${CARD_INTERACTIVE}`}
    >
      <div className="relative">
        <img
          src={`https://img.youtube.com/vi/${getYouTubeVideoId(videoUrl)}/mqdefault.jpg`}
          alt={thumbnailAlt}
          className="aspect-video w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 transition-colors group-hover:bg-black/70">
            <svg
              className="ml-1 h-7 w-7 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <Title className="line-clamp-2 text-lg leading-snug font-semibold">
          {title}
        </Title>
        {summary && (
          <p className="text-muted-foreground mt-2 line-clamp-5 text-sm leading-relaxed">
            {summary}
          </p>
        )}
        <p className="text-muted-foreground mt-auto pt-4 text-xs font-medium">
          {byline}
        </p>
      </div>
    </Link>
  );
}
