import { buildLocalizedPath, getPublishedPages } from "@/app/lib/pages";
import { generateVideoSlug } from "@/app/lib/video-utils";
import { db } from "@/db";
import {
  chatConversations,
  detransQuestions,
  detransUsers,
  studies,
  videos,
} from "@/db/schema";
import { locales } from "@/i18n/locales";
import { defaultLocale, pathnames } from "@/i18n/routing";
import { and, desc, eq, or } from "drizzle-orm";
import { NextRequest } from "next/server";

// Type assertion for pathnames to match the expected type
const localizedPaths = pathnames as Record<
  string,
  string | Record<string, string>
>;

// Static routes don't change per-request; a fixed date avoids "lastmod
// inflation" (which makes crawlers distrust the whole sitemap). Dynamic
// entries use their real updatedAt timestamps instead.
const STATIC_LAST_MODIFIED = "2026-01-01T00:00:00.000Z";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "detrans.ai";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  // Fetch all users from database
  const users = await db
    .select({ username: detransUsers.username })
    .from(detransUsers);

  // Fetch top 500 questions from database based on mode
  const questionsTable = detransQuestions;
  const topQuestions = await db
    .select({ name: questionsTable.name })
    .from(questionsTable)
    .orderBy(desc(questionsTable.viewsCount))
    .limit(500);

  // Fetch featured conversations (limit to 2000 for sitemap)
  const featuredConversations = await db
    .select({
      uuid: chatConversations.uuid,
      updatedAt: chatConversations.updatedAt,
    })
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.featured, true),
        or(
          eq(chatConversations.mode, "detrans"),
          eq(chatConversations.mode, "detrans_chat"),
        ),
      ),
    )
    .orderBy(desc(chatConversations.updatedAt))
    .limit(2000);

  // Fetch all processed videos for sitemap
  const allVideos = await db
    .select({ id: videos.id, title: videos.title, updatedAt: videos.updatedAt })
    .from(videos)
    .where(eq(videos.processed, true));

  // Fetch all approved studies for sitemap
  const approvedStudies = await db
    .select({ id: studies.id, updatedAt: studies.updatedAt })
    .from(studies)
    .where(eq(studies.approved, true));

  const baseRoutes = [
    {
      url: baseUrl,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/videos`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/definitions`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/studies`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/prompts`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/participate`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/donate`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/stats`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  // Generate routes for featured conversations
  const featuredConversationRoutes = featuredConversations.map(
    (conversation) => ({
      url: `${baseUrl}/chat/${conversation.uuid}`,
      lastModified: conversation.updatedAt.toISOString(),
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  // Generate routes for all videos
  const videoRoutes = allVideos.map((video) => ({
    url: `${baseUrl}/videos/${generateVideoSlug(video.id, video.title)}`,
    lastModified: video.updatedAt.toISOString(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Generate routes for all approved studies
  const studyRoutes = approvedStudies.map((study) => ({
    url: `${baseUrl}/studies/${study.id}`,
    lastModified: study.updatedAt.toISOString(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Helper function to get localized path
  const getLocalizedPath = (path: string, locale: string): string => {
    // Extract the path part after baseUrl
    const pathPart = path.replace(baseUrl, "");
    // Find the matching base path
    const basePath = Object.keys(localizedPaths).find(
      (bp) => pathPart === bp || pathPart.startsWith(bp + "/"),
    );

    if (basePath) {
      const pathValue = localizedPaths[basePath];
      let localizedBase = basePath;

      if (typeof pathValue === "string") {
        localizedBase = pathValue;
      } else if (pathValue && typeof pathValue === "object") {
        localizedBase =
          pathValue[locale] || pathValue[defaultLocale] || basePath;
      }

      return pathPart.replace(basePath, localizedBase);
    }

    return pathPart;
  };

  // Generate localized routes with hreflang support
  const generateLocalizedRoutes = (routes: typeof baseRoutes) => {
    const localizedRoutes: Array<{
      url: string;
      lastModified: string;
      changeFrequency: string;
      priority: number;
      alternates?: Record<string, string>;
    }> = [];

    // All supported languages for localization from locales.ts
    const allLocales = locales as readonly string[];

    for (const route of routes) {
      // Check if this is a base route that should have localized versions
      const isLocalisedRoute = baseRoutes.some(
        (br) =>
          br.url === route.url ||
          (route.url.startsWith(`${baseUrl}/`) &&
            !route.url.includes("/chat/")),
      );

      if (isLocalisedRoute) {
        // Extract the path from the URL
        const pathPart = route.url.replace(baseUrl, "");

        // Generate localized versions for base routes
        for (const locale of allLocales) {
          const localizedPath = getLocalizedPath(route.url, locale);
          const localizedUrl = `${baseUrl}/${locale}${localizedPath}`;
          const alternates: Record<string, string> = {};

          // Add hreflang alternates for all locales
          for (const altLocale of allLocales) {
            const altPath = getLocalizedPath(route.url, altLocale);
            alternates[altLocale] = `${baseUrl}/${altLocale}${altPath}`;
          }
          // Add x-default
          alternates["x-default"] =
            `${baseUrl}/${defaultLocale}${getLocalizedPath(route.url, defaultLocale)}`;

          localizedRoutes.push({
            url: localizedUrl,
            lastModified: route.lastModified,
            changeFrequency: route.changeFrequency,
            priority: route.priority,
            alternates,
          });
        }
      } else {
        // Keep non-base routes as-is (they don't need localization in sitemap)
        localizedRoutes.push({
          ...route,
          alternates: undefined,
        });
      }
    }

    return localizedRoutes;
  };

  const allRoutes = [
    ...baseRoutes,
    //...topQuestionResearchRoutes,
    ...featuredConversationRoutes,
    ...videoRoutes,
    ...studyRoutes,
  ];

  const localizedRoutes = generateLocalizedRoutes(allRoutes);

  // ---------------------------------------------------------------------
  // Wiki topic pages: generated as true per-locale variants because slug
  // segments are translated per locale. Each URL self-canonicalizes and its
  // hreflang alternates point at the other locales' translated paths.
  // ---------------------------------------------------------------------
  const wikiPages = await getPublishedPages();
  const wikiById = new Map(wikiPages.map((entry) => [entry.page.id, entry]));
  const sitemapLocales = locales as readonly string[];

  const topicRoutes: Array<{
    url: string;
    lastModified: string;
    changeFrequency: string;
    priority: number;
    alternates?: Record<string, string>;
  }> = [];

  for (const entry of wikiPages) {
    const alternates: Record<string, string> = {};
    for (const locale of sitemapLocales) {
      alternates[locale] = `${baseUrl}/${locale}/topics/${buildLocalizedPath(
        entry,
        wikiById,
        locale,
      )}`;
    }
    alternates["x-default"] =
      `${baseUrl}/${defaultLocale}/topics/${buildLocalizedPath(
        entry,
        wikiById,
        defaultLocale,
      )}`;

    for (const locale of sitemapLocales) {
      topicRoutes.push({
        url: alternates[locale],
        lastModified: entry.page.updatedAt.toISOString(),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates,
      });
    }
  }

  localizedRoutes.push(...topicRoutes);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${localizedRoutes
  .map((route) => {
    let alternatesXml = "";
    if (route.alternates) {
      alternatesXml = Object.entries(route.alternates)
        .map(([lang, url]) => {
          // Map locale codes to proper BCP47 hreflang tags
          const hreflangMap: Record<string, string> = {
            en: "en-US",
            ar: "ar-SA",
            bg: "bg-BG",
            cz: "cs-CZ",
            da: "da-DK",
            de: "de-DE",
            el: "el-GR",
            es: "es-ES",
            fa: "fa-IR",
            fi: "fi-FI",
            fr: "fr-FR",
            he: "he-IL",
            hi: "hi-IN",
            hu: "hu-HU",
            id: "id-ID",
            it: "it-IT",
            ja: "ja-JP",
            ko: "ko-KR",
            lt: "lt-LT",
            nl: "nl-NL",
            no: "no-NO",
            pl: "pl-PL",
            pt: "pt-PT",
            ro: "ro-RO",
            ru: "ru-RU",
            sl: "sl-SI",
            sv: "sv-SE",
            th: "th-TH",
            tr: "tr-TR",
            uk: "uk-UA",
            vi: "vi-VN",
            "zh-cn": "zh-CN",
            "zh-tw": "zh-TW",
            "x-default": "x-default",
          };
          const hreflang = hreflangMap[lang] || lang;
          return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${url}" />`;
        })
        .join("\n");
    }
    return `  <url>
    <loc>${route.url}</loc>
    <lastmod>${route.lastModified}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>${alternatesXml ? "\n" + alternatesXml : ""}
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
