import type { StudyCategory } from "@/app/lib/study-category-urls";
import { getStudyCategoryPath } from "@/app/lib/study-category-urls";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { LinkCard } from "../ui/card";

export function StudyCategoryGrid({
  categories,
  locale,
}: {
  categories: StudyCategory[];
  locale: string;
}) {
  const t = useTranslations("studiesPage");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <LinkCard
          key={category.id}
          href={getStudyCategoryPath(locale, category.kind, category.slug)}
        >
          <h2 className="text-lg leading-snug font-semibold">
            {category.name}
          </h2>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed">
            {category.description}
          </p>
          <span className="text-muted-foreground group-hover:text-foreground mt-auto flex items-center gap-1 pt-4 text-sm font-medium">
            {t("studyCount", { count: category.studyCount })}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </LinkCard>
      ))}
    </div>
  );
}
