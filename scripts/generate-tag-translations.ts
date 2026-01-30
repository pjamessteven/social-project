import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransTags } from "../db/schema";
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

interface TagWithTranslations {
  id: number;
  name: string;
  nameTranslation: string | null;
}

function getExistingTranslations(translationJson: string | null): Record<string, string> {
  if (!translationJson) return {};
  
  try {
    return JSON.parse(translationJson) as Record<string, string>;
  } catch {
    return {};
  }
}

async function translateTagName(
  tagName: string,
  targetLocale: string,
): Promise<string> {
  const languageName = languageNames[targetLocale] || targetLocale;
  
  const prompt = `Translate the following tag/category name to ${languageName}. 
This is a user-facing tag name for categorizing detransition stories.
Maintain the same meaning and keep it concise. Only return the translated tag name, nothing else.

Tag name to translate:
${tagName}

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
    
    if (!translatedText || translatedText.length < 1) {
      console.warn(`  ⚠️  Empty translation received for ${targetLocale}`);
      return tagName;
    }

    return translatedText;
  } catch (error) {
    console.error(`  ❌ Error translating to ${targetLocale}:`, error);
    return tagName;
  }
}

async function generateMissingTranslations(tag: TagWithTranslations): Promise<string | null> {
  // Get existing translations
  const existingTranslations = getExistingTranslations(tag.nameTranslation);

  // Find missing locales
  const missingLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !existingTranslations[locale]
  );

  if (missingLocales.length === 0) {
    console.log(`  ⏭️  All translations already exist, skipping...`);
    return null;
  }

  console.log(`  📝 Generating ${missingLocales.length} missing translations...`);

  // Generate translations for missing locales
  for (const locale of missingLocales) {
    existingTranslations[locale] = await translateTagName(tag.name, locale);
    await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
  }

  return JSON.stringify(existingTranslations);
}

async function generateTranslations() {
  console.log(`Fetching tags from database...`);
  console.log(`Configured locales: ${locales.join(", ")}\n`);

  // Fetch all tags
  const tags = await db
    .select({
      id: detransTags.id,
      name: detransTags.name,
      nameTranslation: detransTags.nameTranslation,
    })
    .from(detransTags);

  console.log(`Found ${tags.length} tags to process\n`);

  if (tags.length === 0) {
    console.log("No tags found in the database.");
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    
    console.log(`\n[${i + 1}/${tags.length}] Processing tag: ${tag.name}`);

    try {
      const translations = await generateMissingTranslations(tag);

      if (!translations) {
        skippedCount++;
        continue;
      }

      // Update the tag with new translations
      await db
        .update(detransTags)
        .set({
          nameTranslation: translations,
        })
        .where(eq(detransTags.id, tag.id));

      console.log(`  ✅ Updated translations for tag: ${tag.name}`);
      updatedCount++;

      // Add delay between tags to avoid rate limiting
      if (i < tags.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`  ❌ Error processing tag ${tag.name}:`, error);
      errorCount++;
    }
  }

  console.log("\n📊 Translation Generation Summary:");
  console.log(`✅ Tags updated with translations: ${updatedCount}`);
  console.log(`⏭️  Tags skipped (already complete): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total tags: ${tags.length}`);
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
