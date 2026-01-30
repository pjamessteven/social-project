"use client";

interface StudyDescriptionProps {
  description: string;
  url: string;
}

export function StudyDescription({ description, url }: StudyDescriptionProps) {
  return (
    <div className="text-muted-foreground border-t text-sm">
      <p>{description}</p>
      <div className="-mt-1 flex items-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 no-underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <span>{url}</span>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          <span className="sr-only">(opens in new tab)</span>
        </a>
      </div>
    </div>
  );
}
