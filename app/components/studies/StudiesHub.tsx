"use client";

import type {
  StudyCategory,
  StudyCategoryKind,
} from "@/app/lib/study-category-urls";
import { Study } from "@/app/types/study";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { SearchBar } from "../ui/search-bar";
import { SlidingNavGroup } from "../ui/sliding-nav-group";
import { StudyCategoryAdmin } from "./StudyCategoryAdmin";
import { StudyCategoryGrid } from "./StudyGrid";
import { StudyList } from "./StudyList";

interface StudiesHubProps {
  categories: StudyCategory[];
  /** Approved studies (searched client-side) */
  studies: Study[];
  /** Admin only: unapproved studies */
  pendingStudies?: Study[];
  isAdmin: boolean;
  locale: string;
  /** Rendered between the category grid and the full study list */
  afterCategories?: ReactNode;
}

export function matchesStudyQuery(study: Study, query: string): boolean {
  return [
    study.headline,
    study.title,
    study.authors,
    study.journal,
    study.cardSummary,
    study.description,
    ...(study.categories ?? []).map((c) => c.name),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function StudiesHub({
  categories,
  studies,
  pendingStudies = [],
  isAdmin,
  locale,
  afterCategories,
}: StudiesHubProps) {
  const t = useTranslations("studiesPage");
  // The tab lives in the URL (?by=method) so back/forward and shared links
  // restore it; native history updates keep useSearchParams in sync.
  const searchParams = useSearchParams();
  const view: StudyCategoryKind =
    searchParams.get("by") === "method" ? "method" : "topic";
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingExpanded, setPendingExpanded] = useState(true);

  const query = searchQuery.trim().toLowerCase();
  const results = useMemo(
    () => (query ? studies.filter((s) => matchesStudyQuery(s, query)) : []),
    [studies, query],
  );

  // Admins see empty categories (to fill them); visitors don't
  const visibleCategories = categories.filter(
    (c) => c.kind === view && (isAdmin || c.studyCount > 0),
  );
  const uncategorised = isAdmin
    ? studies.filter(
        (s) =>
          !s.categories?.some((c) => c.kind === "method") ||
          !s.categories?.some((c) => c.kind === "topic"),
      )
    : [];

  const selectView = (next: StudyCategoryKind) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "method") params.set("by", "method");
    else params.delete("by");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("searchPlaceholder")}
          className="w-full sm:grow"
        />
        <SlidingNavGroup
          tabs={[
            { key: "topic", label: t("byTopic"), isActive: view === "topic" },
            {
              key: "method",
              label: t("byMethod"),
              isActive: view === "method",
            },
          ]}
          className="bg-secondary/50 dark:bg-secondary/30 flex shrink-0 border"
          onTabClick={(key) => selectView(key as StudyCategoryKind)}
          tabClassName="w-full sm:w-auto sm:px-5 flex justify-center whitespace-nowrap"
        />
      </div>

      {isAdmin && pendingStudies.length > 0 && (
        <section>
          <button
            onClick={() => setPendingExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-xl font-semibold"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                pendingExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
            {t("pendingReview")} ({pendingStudies.length})
          </button>
          {pendingExpanded && (
            <div className="mt-4 opacity-80">
              <StudyList studies={pendingStudies} locale={locale} isAdmin />
            </div>
          )}
        </section>
      )}

      {query ? (
        <section>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("resultCount", { count: results.length })}
          </p>
          {results.length > 0 ? (
            <StudyList studies={results} locale={locale} isAdmin={isAdmin} />
          ) : (
            <p className="text-muted-foreground">{t("noResults")}</p>
          )}
        </section>
      ) : (
        <>
          <StudyCategoryGrid categories={visibleCategories} locale={locale} />
          {afterCategories}
          <section className="pt-8">
            <h2 className="mb-4 flex items-baseline gap-2 text-xl font-semibold">
              {t("allStudies")}
              <span className="text-muted-foreground text-sm font-normal">
                {studies.length}
              </span>
            </h2>
            {/* Newest first (sorted by year by the loader) */}
            <StudyList studies={studies} locale={locale} isAdmin={isAdmin} />
          </section>
        </>
      )}

      {isAdmin && (
        <section className="space-y-6 rounded-xl border border-dashed p-5">
          <StudyCategoryAdmin kind={view} />
          {uncategorised.length > 0 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold">
                Missing a topic or method ({uncategorised.length})
              </h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Admin only — assign categories from each study&apos;s edit
                page.
              </p>
              <StudyList studies={uncategorised} locale={locale} isAdmin />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
