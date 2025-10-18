import { availableTags } from "@/app/lib/availableTags";
import {
  affirmingQuestionCategories,
  questionCategories,
} from "@/app/lib/questions";
import { slugify } from "@/app/lib/utils";
import { db } from "@/db";
import { detransUsers, detransQuestions, affirmQuestions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "detrans.ai";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;
  const isAffirm = !!host.includes("genderaffirming.ai");

  // Extract all questions from question categories
  const allQuestions = questionCategories.flatMap(
    (category) => category.questions,
  );
  const allAffirmingQuestions = affirmingQuestionCategories.flatMap(
    (category) => category.questions,
  );

  // Fetch all users from database
  const users = await db
    .select({ username: detransUsers.username })
    .from(detransUsers);

  // Fetch top 1000 questions from database based on mode
  const questionsTable = isAffirm ? affirmQuestions : detransQuestions;
  const topQuestions = await db
    .select({ name: questionsTable.name })
    .from(questionsTable)
    .orderBy(desc(questionsTable.viewsCount))
    .limit(1000);

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
  ];

  const affirmRoutes = [
    {
      url: `${baseUrl}/affirm`,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/affirm/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/affirm/donate`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/affirm/terms`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/affirm/studies`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/affirm/prompts`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.4,
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

  const affirmResearchRoutes = allAffirmingQuestions.map((question) => ({
    url: `${baseUrl}/affirm/research/${slugify(question)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Generate chat routes for top questions from database
  const topQuestionResearchRoutes = topQuestions.map((question) => ({
    url: isAffirm 
      ? `${baseUrl}/affirm/research/${slugify(question.name)}`
      : `${baseUrl}/research/${slugify(question.name)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const allRoutes = [
    ...(isAffirm ? affirmRoutes : baseRoutes),
    ...(isAffirm ? affirmResearchRoutes : researchRoutes),
    ...topQuestionResearchRoutes,
    ...(isAffirm ? [] : userRoutes),
    ...(isAffirm ? [] : tagRoutes),
    ...(isAffirm ? [] : sexRoutes),
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
