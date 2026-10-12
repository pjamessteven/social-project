import { buildLocalizedPath, type PageWithSlugs } from "@/app/lib/pages";
import { getStudySlugMaps } from "@/app/lib/study-slugs";
import { getStudyPath, pickStudySlug } from "@/app/lib/study-urls";
import { getPathname, locales, pathnames } from "@/i18n/routing";

const LOCALE_PREFIX = new RegExp(
  `^/(${[...locales].sort((a, b) => b.length - a.length).join("|")})(?=/|$)`,
);
const STUDY_LINK = /^\/studies\/(\d+)\/?$/;
const TOPIC_LINK = /^\/topics\/(.+?)\/?$/;

/**
 * Builds an href rewriter for a wiki page body rendered in `locale`, so
 * internal links point straight at their canonical URL instead of going
 * through redirects:
 *
 * - /studies/{id} (legacy numeric) -> /{locale}/{studies-base}/{slug}
 * - /{any-locale}/topics/{path} -> the page's localized path in `locale`,
 *   following moved pages by their final segment (like the page route does)
 * - other root-relative links get the `locale` prefix (localized base paths
 *   for static routes)
 */
export async function buildWikiHrefRewriter(
  content: string,
  locale: string,
  byId: Map<number, PageWithSlugs>,
): Promise<(href: string) => string> {
  const studyIds = [
    ...new Set(
      [...content.matchAll(/\/studies\/(\d+)/g)].map((m) => Number(m[1])),
    ),
  ];
  const studySlugs = await getStudySlugMaps(studyIds);

  const published = [...byId.values()].filter((entry) => entry.page.published);
  const byPath = new Map(published.map((entry) => [entry.page.path, entry]));

  const findTopic = (path: string): PageWithSlugs | null => {
    const exact = byPath.get(path);
    if (exact) return exact;
    const last = path.split("/").pop();
    const matches = published.filter(
      (entry) =>
        entry.page.slug === last ||
        Object.values(entry.slugs).includes(last ?? ""),
    );
    return matches.length === 1 ? matches[0] : null;
  };

  return (href: string) => {
    const match = /^([^?#]*)(.*)$/.exec(href);
    if (!match) return href;
    const [, rawPath, suffix] = match;
    const path = rawPath.replace(LOCALE_PREFIX, "") || "/";

    const study = STUDY_LINK.exec(path);
    if (study) {
      const id = Number(study[1]);
      return (
        getStudyPath(
          locale,
          pickStudySlug(studySlugs.get(id) ?? {}, locale, id),
        ) + suffix
      );
    }

    const topic = TOPIC_LINK.exec(path);
    if (topic) {
      let decoded = topic[1];
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        // keep the raw path
      }
      const entry = findTopic(decoded);
      if (entry) {
        return `/${locale}/topics/${buildLocalizedPath(entry, byId, locale)}${suffix}`;
      }
      return `/${locale}${path}${suffix}`;
    }

    if (path in pathnames) {
      return (
        getPathname({ href: path as keyof typeof pathnames, locale } as never) +
        suffix
      );
    }
    return `/${locale}${path === "/" ? "" : path}${suffix}`;
  };
}
