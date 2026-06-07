"use client";

import { StudyCard } from "@/app/components/content/StudyCard";
import { StudyAdminWrapper } from "@/app/components/StudyAdminWrapper";
import { Study } from "@/app/types/study";
import { SearchBar } from "./ui/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const METHODOLOGY_TAGS = [
  "cohort study",
  "systematic review",
  "qualitative research",
  "case report",
  "survey",
];

interface StudiesListProps {
  studies: Study[];
  isAdmin: boolean;
  locale: string;
}

function StudyItem({
  study,
  isAdmin,
  locale,
}: {
  study: Study;
  isAdmin: boolean;
  locale: string;
}) {
  const card = <StudyCard study={study} isAdmin={isAdmin} locale={locale} />;

  if (isAdmin) {
    return (
      <StudyAdminWrapper study={study} locale={locale}>
        {card}
      </StudyAdminWrapper>
    );
  }

  return card;
}

export function StudiesList({ studies, isAdmin, locale }: StudiesListProps) {
  const t = useTranslations("studiesPage");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethodology, setSelectedMethodology] = useState<string | null>(
    null,
  );
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [pendingExpanded, setPendingExpanded] = useState(true);

  const pendingStudies = studies.filter((s) => !s.approved);
  const approvedStudies = studies.filter((s) => s.approved);

  // Extract unique tags from approved studies
  const allTags = new Set<string>();
  approvedStudies.forEach((s) => s.tags?.forEach((t) => allTags.add(t)));

  const methodologyOptions = METHODOLOGY_TAGS.filter((t) => allTags.has(t));
  const topicOptions = Array.from(allTags)
    .filter((t) => !METHODOLOGY_TAGS.includes(t))
    .sort((a, b) => a.localeCompare(b));

  const query = searchQuery.trim().toLowerCase();
  const displayedStudies = approvedStudies.filter((s) => {
    if (query) {
      const text = (
        (s.headline || "") +
        " " +
        (s.title || "") +
        " " +
        (s.authors || "") +
        " " +
        (s.description || "") +
        " " +
        (s.tags?.join(" ") || "")
      ).toLowerCase();
      if (!text.includes(query)) return false;
    }
    if (selectedMethodology && !s.tags?.includes(selectedMethodology))
      return false;
    if (selectedTopic && !s.tags?.includes(selectedTopic)) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Search + Dropdown filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("searchPlaceholder")}
          className="w-full sm:w-1/2"
        />
        <div className="flex w-full gap-3 sm:w-1/2">
          <Select
            value={selectedMethodology ?? "all"}
            onValueChange={(val) =>
              setSelectedMethodology(val === "all" ? null : val)
            }
          >
            <SelectTrigger className="bg-background dark:text-muted-foreground h-12 w-full rounded-full border px-4 text-base [&>span]:truncate">
              <SelectValue placeholder={t("methodology")} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">{t("methodology")}</SelectItem>
              {methodologyOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedTopic ?? "all"}
            onValueChange={(val) =>
              setSelectedTopic(val === "all" ? null : val)
            }
          >
            <SelectTrigger className="bg-background dark:text-muted-foreground h-12 w-full rounded-full border px-4 text-base [&>span]:truncate">
              <SelectValue placeholder={t("topic")} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">{t("topic")}</SelectItem>
              {topicOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isAdmin && pendingStudies.length > 0 && (
        <div>
          <button
            onClick={() => setPendingExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                pendingExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
            {t("pendingReview")} ({pendingStudies.length})
          </button>
          {pendingExpanded && (
            <div className="mt-4 space-y-6">
              {pendingStudies.map((study) => (
                <div
                  key={study.id}
                  className="opacity-70 transition-opacity hover:opacity-100"
                >
                  <StudyItem study={study} isAdmin={isAdmin} locale={locale} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="space-y-6">
          {displayedStudies.map((study) => (
            <div className="rounded-xl shadow-sm" key={study.id}>
              <StudyItem study={study} isAdmin={isAdmin} locale={locale} />
            </div>
          ))}
        </div>

        {displayedStudies.length === 0 && (
          <p className="text-gray-500">
            {query || selectedMethodology || selectedTopic
              ? t("noResults")
              : t("noStudies")}
          </p>
        )}
      </div>
    </div>
  );
}
