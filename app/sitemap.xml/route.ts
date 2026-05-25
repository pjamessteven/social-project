import { questionCategories } from "@/app/lib/questions";
import { slugify } from "@/app/lib/utils";
import { generateVideoSlug } from "@/app/lib/video-utils";
import { db } from "@/db";
import {
  chatConversations,
  detransQuestions,
  detransUsers,
  videos,
} from "@/db/schema";
import { defaultLocale, pathnames } from "@/i18n/routing";
import { locales } from "@/i18n/locales";
import { and, desc, eq, or } from "drizzle-orm";
import { NextRequest } from "next/server";

// Type assertion for pathnames to match the expected type
const localizedPaths = pathnames as Record<
  string,
  string | Record<string, string>
>;

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "detrans.ai";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  // Extract all questions from question categories
  const allQuestions = questionCategories.flatMap(
    (category) => category.questions,
  );

  // Fetch all users from database
  const users = await db
    .select({ username: detransUsers.username })
    .from(detransUsers);

  // Fetch top 1000 questions from database based on mode
  const questionsTable = detransQuestions;
  const topQuestions = await db
    .select({ name: questionsTable.name })
    .from(questionsTable)
    .orderBy(desc(questionsTable.viewsCount))
    .limit(1000);

  // Fetch featured conversations (limit to 1000 for sitemap)
  const featuredConversations = await db
    .select({ uuid: chatConversations.uuid })
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
    .limit(1000);

  // Fetch all processed videos for sitemap
  const allVideos = await db
    .select({ id: videos.id, title: videos.title })
    .from(videos)
    .where(eq(videos.processed, true));

  const baseRoutes = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/videos`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/definitions`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/studies`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/prompts`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.6,
    },

    {
      url: `${baseUrl}/conversations`,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/participate`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Generate chat routes for all questions
  const researchRoutes = allQuestions.map((question) => ({
    url: `${baseUrl}/research/${slugify(question)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Generate chat routes for top questions from database
  const topQuestionResearchRoutes = topQuestions.map((question) => ({
    url: `${baseUrl}/research/${slugify(question.name)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Generate routes for featured conversations
  const featuredConversationRoutes = featuredConversations.map(
    (conversation) => ({
      url: `${baseUrl}/chat/${conversation.uuid}`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  // Generate routes for all videos
  const videoRoutes = allVideos.map((video) => ({
    url: `${baseUrl}/videos/${generateVideoSlug(video.id, video.title)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
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
            !route.url.includes("/research/") &&
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
    ...researchRoutes,
    ...topQuestionResearchRoutes,
    ...featuredConversationRoutes,
    ...videoRoutes,
  ];

  const localizedRoutes = generateLocalizedRoutes(allRoutes);

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
            "en": "en-US",
            "ar": "ar-SA",
            "bg": "bg-BG",
            "cz": "cs-CZ",
            "da": "da-DK",
            "de": "de-DE",
            "el": "el-GR",
            "es": "es-ES",
            "fa": "fa-IR",
            "fi": "fi-FI",
            "fr": "fr-FR",
            "he": "he-IL",
            "hi": "hi-IN",
            "hu": "hu-HU",
            "id": "id-ID",
            "it": "it-IT",
            "ja": "ja-JP",
            "ko": "ko-KR",
            "lt": "lt-LT",
            "nl": "nl-NL",
            "no": "no-NO",
            "pl": "pl-PL",
            "pt": "pt-PT",
            "ro": "ro-RO",
            "ru": "ru-RU",
            "sl": "sl-SI",
            "sv": "sv-SE",
            "th": "th-TH",
            "tr": "tr-TR",
            "uk": "uk-UA",
            "vi": "vi-VN",
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
