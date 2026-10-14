import { getFeaturedTopic } from "@/app/lib/pages";
import type { Locale } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LinkCard } from "../ui/card";
import FeaturedTopicTail from "./FeaturedTopicTail";

/** Startpage speech bubble from the nav's Topics tab, linking to today's
 * featured wiki topic. */
export default async function FeaturedArticleCard({
  locale,
}: {
  locale: string;
}) {
  const topic = await getFeaturedTopic(locale);
  if (!topic) return null;

  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home.featuredArticle",
  });

  const href = `/${locale}/topics/${topic.localizedPath}`;

  return (
    <LinkCard
      href={href}
      // The nav pill's soft shadow, with a stronger ring (in place of a border
      // in light mode) so the card holds up on a white page. The hover shadow keeps the same layers, only
      // deeper, so it animates smoothly.
      className="relative flex-row items-center gap-3 border-0 px-4 py-3 shadow-[0px_0px_0px_1px_rgba(14,63,126,0.14),0px_1px_1px_-0.5px_rgba(42,51,70,0.03),0px_2px_2px_-1px_rgba(42,51,70,0.04),0px_3px_3px_-1.5px_rgba(42,51,70,0.04),0px_5px_5px_-2.5px_rgba(42,51,70,0.03),0px_10px_10px_-5px_rgba(42,51,70,0.03),0px_24px_24px_-8px_rgba(42,51,70,0.03)] duration-200 hover:shadow-[0px_0px_0px_1px_rgba(14,63,126,0.22),0px_1px_1px_-0.5px_rgba(42,51,70,0.06),0px_2px_2px_-1px_rgba(42,51,70,0.08),0px_3px_3px_-1.5px_rgba(42,51,70,0.08),0px_5px_5px_-2.5px_rgba(42,51,70,0.07),0px_10px_10px_-5px_rgba(42,51,70,0.07),0px_24px_24px_-8px_rgba(42,51,70,0.07)] dark:border"
    >
      <FeaturedTopicTail />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm leading-6 font-semibold">
          <span className="text-muted-foreground me-1.5">{t("label")}:</span>
          {topic.title}
        </div>
        {topic.summary && (
          <p className="text-muted-foreground truncate text-xs leading-5">
            {topic.summary}
          </p>
        )}
      </div>
      <ArrowRight
        className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
        aria-hidden
      />
    </LinkCard>
  );
}
