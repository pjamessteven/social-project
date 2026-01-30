"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "./ui/badge";

interface Tag {
  name: string;
  nameTranslation: string | null;
}

interface User {
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  experienceSummaryTranslation: string | null;
  tags: Tag[];
  commentCount: number;
  transitionAge: number | null;
  detransitionAge: number | null;
}

interface UserCardProps {
  user: User;
}

function getLocalizedField(
  defaultValue: string | null,
  translationsJson: string | null,
  locale: string
): string | null {
  if (!translationsJson) return defaultValue;

  try {
    const translations = JSON.parse(translationsJson) as Record<string, string>;
    return translations[locale] || defaultValue;
  } catch {
    return defaultValue;
  }
}

function getLocalizedTagName(
  tag: Tag,
  locale: string
): string {
  if (!tag.nameTranslation) return tag.name;

  try {
    const translations = JSON.parse(tag.nameTranslation) as Record<string, string>;
    return translations[locale] || tag.name;
  } catch {
    return tag.name;
  }
}

export default function UserCard({ user }: UserCardProps) {
  const t = useTranslations("stories.userCard");
  const locale = useLocale();

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(locale);
  }

  const localizedExperienceSummary = getLocalizedField(
    user.experienceSummary,
    user.experienceSummaryTranslation,
    locale
  );
  return (
    <>
      <div className="-mx-4 border-t pt-4 sm:hidden" />
      <Link
        href={`/stories/${encodeURIComponent(user.username)}`}
        className="block no-underline transition-colors sm:rounded-lg sm:border sm:p-6 sm:pt-6 sm:hover:bg-gray-50 sm:dark:hover:bg-gray-800/80"
      >
        <div className="flex w-full grow flex-row items-center justify-between">
          <div className="no-wrap mb-2 flex grow flex-col items-start justify-between sm:flex-row">
            <h3 className="text-lg font-semibold">/u/{user.username}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {t("comments", { count: user.commentCount })} •{" "}
                {t("postingSince", { date: formatDate(user.activeSince) })}
              </span>
            </div>
          </div>
          <ChevronRight className="mb-3 h-6 sm:hidden" />
        </div>
        <div className="mt-4 mb-2 font-medium text-gray-700 sm:mt-2 dark:text-gray-300">
          {user.transitionAge &&
            t("transitionedAt", { age: user.transitionAge })}
          {user.detransitionAge && user.transitionAge && " -> "}
          {user.detransitionAge &&
            (user.tags.some((tag) => tag.name === "only transitioned socially")
              ? t("desistedAt", { age: user.detransitionAge })
              : t("detransitionedAt", { age: user.detransitionAge }))}
        </div>
        {localizedExperienceSummary && (
          <p className="prose-base mb-4 text-gray-700 dark:text-gray-300">
            {localizedExperienceSummary}
          </p>
        )}

        {user.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant={"inverted"}>
              {user.sex === "f" ? t("female") : t("male")}
            </Badge>
            {user.tags.map((tag) => (
              <Badge
                key={tag.name}
                variant={
                  tag.name === "suspicious account" ? "destructive" : "inverted"
                }
              >
                {getLocalizedTagName(tag, locale)}
              </Badge>
            ))}
          </div>
        )}
      </Link>
    </>
  );
}
