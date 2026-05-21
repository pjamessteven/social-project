"use client";

import {
  Markdown as MarkdownUI,
  SourceData,
} from "@llamaindex/chat-ui/widgets";
import { getConfig } from "../../lib/utils";
import Link from "next/link";

const preprocessMedia = (content: string) => {
  // Remove `sandbox:` from the beginning of the URL before rendering markdown
  // OpenAI models sometimes prepend `sandbox:` to relative URLs - this fixes it
  return content.replace(/(sandbox|attachment|snt):/g, "");
};

function CustomLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (href?.startsWith("/studies/")) {
    return (
      <Link href={href} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function Markdown({
  content,
  sources,
}: {
  content: string;
  sources?: SourceData;
}) {
  const processedContent = preprocessMedia(content);
  return (
    <MarkdownUI
      content={processedContent}
      backend={getConfig("BACKEND")}
      sources={sources}
      components={{ a: CustomLink as any }}
    />
  );
}
