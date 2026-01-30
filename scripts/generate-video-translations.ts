import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { videos } from "../db/schema";
import { OpenAI } from "openai";
import { locales } from "../i18n/routing";

dotenv.config();

// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

// OpenAI client configured for OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const MODEL = "deepseek/deepseek-chat-v3.1";
const DEFAULT_LOCALE = "en";

// Language names mapping for translation prompts
const languageNames: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  hi: "Hindi",
  tr: "Turkish",
  pl: "Polish",
};

// Backoff utility for API calls
async function fetchWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 500,
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }

      const backoff = delay * Math.pow(2, attempt);
      console.warn(
        `Attempt ${attempt + 1} failed. Retrying in ${backoff}ms...`,
        err,
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt++;
    }
  }

  throw new Error("Unexpected error in fetchWithBackoff");
}

interface VideoWithTranslations {
  id: number;
  title: string;
  author: string;
  description: string | null;
  summary: string | null;
  bite: string | null;
  descriptionTranslation: string | null;
  summaryTranslation: string | null;
  biteTranslation: string | null;
  titleTranslation: string | null;
}

function getExistingTranslations(translationJson: string | null): Record<string, string> {
  if (!translationJson) return {};
  
  try {
    return JSON.parse(translationJson) as Record<string, string>;
  } catch {
    return {};
  }
}

async function translateText(
  text: string,
  targetLocale: string,
  fieldName: string,
): Promise<string> {
  const languageName = languageNames[targetLocale] || targetLocale;
  
  const prompt = `Translate the following ${fieldName} to ${languageName}. 
Maintain the same meaning, tone, and style. Only return the translated text, nothing else.

Text to translate:
${text}

Translation:`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      })
    );

    const translatedText = response.choices[0]?.message?.content?.trim();
    
    if (!translatedText || translatedText.length < 3) {
      console.warn(`  ⚠️  Empty translation received for ${fieldName} in ${targetLocale}`);
      return text;
    }

    return translatedText;
  } catch (error) {
    console.error(`  ❌ Error translating ${fieldName} to ${targetLocale}:`, error);
    return text;
  }
}

async function generateMissingTranslations(video: VideoWithTranslations): Promise<{
  descriptionTranslation: string | null;
  summaryTranslation: string | null;
  biteTranslation: string | null;
  titleTranslation: string | null;
} | null> {
  // Get existing translations
  const descriptionTranslations = getExistingTranslations(video.descriptionTranslation);
  const summaryTranslations = getExistingTranslations(video.summaryTranslation);
  const biteTranslations = getExistingTranslations(video.biteTranslation);
  const titleTranslations = getExistingTranslations(video.titleTranslation);

  // Find missing locales for each field
  const missingDescriptionLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !descriptionTranslations[locale] && video.description
  );
  const missingSummaryLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !summaryTranslations[locale] && video.summary
  );
  const missingBiteLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !biteTranslations[locale] && video.bite
  );
  const missingTitleLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !titleTranslations[locale] && video.title
  );

  const totalMissing = 
    missingDescriptionLocales.length +
    missingSummaryLocales.length +
    missingBiteLocales.length +
    missingTitleLocales.length;

  if (totalMissing === 0) {
    console.log(`  ⏭️  All translations already exist, skipping...`);
    return null;
  }

  console.log(`  📝 Generating ${totalMissing} missing translations...`);
  console.log(`     - Title: ${missingTitleLocales.length} missing`);
  console.log(`     - Description: ${missingDescriptionLocales.length} missing`);
  console.log(`     - Summary: ${missingSummaryLocales.length} missing`);
  console.log(`     - Bite: ${missingBiteLocales.length} missing`);

  // Generate translations for missing locales
  for (const locale of missingTitleLocales) {
    if (video.title) {
      titleTranslations[locale] = await translateText(video.title, locale, "title");
      await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
    }
  }

  for (const locale of missingDescriptionLocales) {
    if (video.description) {
      descriptionTranslations[locale] = await translateText(video.description, locale, "description");
      await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
    }
  }

  for (const locale of missingSummaryLocales) {
    if (video.summary) {
      summaryTranslations[locale] = await translateText(video.summary, locale, "summary");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  for (const locale of missingBiteLocales) {
    if (video.bite) {
      biteTranslations[locale] = await translateText(video.bite, locale, "bite/tagline");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return {
    titleTranslation: Object.keys(titleTranslations).length > 0 ? JSON.stringify(titleTranslations) : null,
    descriptionTranslation: Object.keys(descriptionTranslations).length > 0 ? JSON.stringify(descriptionTranslations) : null,
    summaryTranslation: Object.keys(summaryTranslations).length > 0 ? JSON.stringify(summaryTranslations) : null,
    biteTranslation: Object.keys(biteTranslations).length > 0 ? JSON.stringify(biteTranslations) : null,
  };
}

async function generateTranslations() {
  console.log(`Fetching videos from database...`);
  console.log(`Configured locales: ${locales.join(", ")}\n`);

  const allVideos = await db
    .select({
      id: videos.id,
      title: videos.title,
      author: videos.author,
      description: videos.description,
      summary: videos.summary,
      bite: videos.bite,
      descriptionTranslation: videos.descriptionTranslation,
      summaryTranslation: videos.summaryTranslation,
      biteTranslation: videos.biteTranslation,
      titleTranslation: videos.titleTranslation,
    })
    .from(videos);

  console.log(`Found ${allVideos.length} videos to process\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allVideos.length; i++) {
    const video = allVideos[i];
    console.log(`\n[${i + 1}/${allVideos.length}] Processing: ${video.title.substring(0, 60)}...`);

    try {
      const translations = await generateMissingTranslations(video);

      if (!translations) {
        skippedCount++;
        continue;
      }

      // Update the video with new translations
      await db
        .update(videos)
        .set({
          titleTranslation: translations.titleTranslation,
          descriptionTranslation: translations.descriptionTranslation,
          summaryTranslation: translations.summaryTranslation,
          biteTranslation: translations.biteTranslation,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, video.id));

      console.log(`  ✅ Updated translations for video ID: ${video.id}`);
      updatedCount++;

      // Add delay between videos to avoid rate limiting
      if (i < allVideos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ❌ Error processing video ${video.id}:`, error);
      errorCount++;
    }
  }

  console.log("\n📊 Translation Generation Summary:");
  console.log(`✅ Videos updated with translations: ${updatedCount}`);
  console.log(`⏭️  Videos skipped (already complete): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total: ${allVideos.length}`);
}

async function main() {
  try {
    await generateTranslations();
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateTranslations };
