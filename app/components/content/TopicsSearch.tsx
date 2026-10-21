"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { SearchBar } from "../ui/search-bar";

export interface TopicSearchEntry {
  href: string;
  title: string;
  summary: string | null;
  /** Titles of the entry's ancestors, hub first. */
  trail: string[];
}

interface TopicsSearchProps {
  /** Every published topic, flattened (searched client-side). */
  entries: TopicSearchEntry[];
  /** The hub cards and index, shown while not searching. */
  children: ReactNode;
}

export function matchesTopicQuery(
  entry: TopicSearchEntry,
  query: string,
): boolean {
  return [entry.title, entry.summary ?? "", ...entry.trail]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

/**
 * Search bar for the /topics hub, styled like the studies and videos
 * searches. While a query is typed the hub cards and index are replaced by
 * a flat list of matching articles.
 */
export function TopicsSearch({ entries, children }: TopicsSearchProps) {
  const t = useTranslations("topicsPage");
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchQuery.trim().toLowerCase();
  // Hubs before their articles, and those before anything nested deeper;
  // the sort is stable, so reading order holds within each level.
  const results = useMemo(
    () =>
      query
        ? entries
            .filter((e) => matchesTopicQuery(e, query))
            .sort((a, b) => a.trail.length - b.trail.length)
        : [],
    [entries, query],
  );

  return (
    <>
      {/* As wide as the intro's description column: its max width, less the
          "See also" aside (18rem) and gap (2.5rem) beside it from lg. */}
      <div className="not-prose mb-8 max-w-3xl lg:max-w-[min(48rem,calc(100%_-_20.5rem))]">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("searchPlaceholder")}
          className="w-full"
        />
      </div>

      {query ? (
        <section className="not-prose">
          <p className="text-muted-foreground mb-4 text-sm">
            {t("resultCount", { count: results.length })}
          </p>
          {results.length > 0 ? (
            <ul className="grid grid-cols-1 items-start gap-x-10 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((entry) => (
                <li key={entry.href}>
                  <a
                    href={entry.href}
                    className="group block"
                    title={entry.summary ?? undefined}
                  >
                    {entry.trail.length > 0 && (
                      <span className="text-muted-foreground mb-0.5 block text-xs">
                        {entry.trail.join(" / ")}
                      </span>
                    )}
                    <span className="block text-base leading-snug font-semibold decoration-1 underline-offset-4 group-hover:underline">
                      {entry.title}
                    </span>
                    {entry.summary && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm leading-relaxed">
                        {entry.summary}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("noResults")}</p>
          )}
        </section>
      ) : (
        children
      )}
    </>
  );
}
