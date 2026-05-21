"use client";

import { StudyCard } from "@/app/components/content/StudyCard";
import { StudyAdminWrapper } from "@/app/components/StudyAdminWrapper";
import { Study } from "@/app/types/study";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface StudiesListProps {
  studies: Study[];
  isAdmin: boolean;
  locale: string;
  tags?: [string, number][];
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

export function StudiesList({
  studies,
  isAdmin,
  locale,
  tags = [],
}: StudiesListProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [pendingExpanded, setPendingExpanded] = useState(true);

  const pendingStudies = studies.filter((s) => !s.approved);
  const approvedStudies = studies.filter((s) => s.approved);

  const displayedStudies = selectedTag
    ? approvedStudies.filter((s) => s.tags?.includes(selectedTag))
    : approvedStudies;

  return (
    <div className="space-y-8">
      {/* Tag filter */}
      {tags.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                selectedTag === null
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "border bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              All ({approvedStudies.length})
            </button>
            {tags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedTag === tag
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {tag} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

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
            Pending Review ({pendingStudies.length})
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
            {selectedTag
              ? `No studies tagged with "${selectedTag}".`
              : "No approved studies yet."}
          </p>
        )}
      </div>
    </div>
  );
}
