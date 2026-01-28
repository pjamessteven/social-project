import { availableTags } from "@/app/lib/availableTags";
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
import { and, desc, eq, or } from "drizzle-orm";
import { NextRequest } from "next/server";

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
      url: `${baseUrl}/donate`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.7,
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
      url: `${baseUrl}/stories`,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/videos`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/conversations`,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Generate tag routes for stories
  const tagRoutes = availableTags.map((tag) => ({
    url: `${baseUrl}/stories?tag=${encodeURIComponent(tag)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Generate sex filter routes for stories
  const sexRoutes = [
    {
      url: `${baseUrl}/stories?sex=f`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/stories?sex=m`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Generate user story routes
  const userRoutes = users.map((user) => ({
    url: `${baseUrl}/stories/${encodeURIComponent(user.username)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

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

  const allRoutes = [
    ...baseRoutes,
    ...researchRoutes,
    ...topQuestionResearchRoutes,
    ...featuredConversationRoutes,
    ...userRoutes,
    ...tagRoutes,
    ...sexRoutes,
    ...videoRoutes,
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (route) => `  <url>
    <loc>${route.url}</loc>
    <lastmod>${route.lastModified}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
