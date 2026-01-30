import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { studies } from "../db/schema";
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

interface StudyWithTranslations {
  id: number;
  headline: string | null;
  title: string | null;
  authors: string | null;
  description: string | null;
  year: number | null;
  url: string;
  displayUrl: string;
  headlineTranslation: string | null;
  titleTranslation: string | null;
  descriptionTranslation: string | null;
  processed: boolean;
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
Maintain the same meaning, tone, and academic style. Only return the translated text, nothing else.

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

async function generateMissingTranslations(study: StudyWithTranslations): Promise<{
  headlineTranslation: string | null;
  titleTranslation: string | null;
  descriptionTranslation: string | null;
} | null> {
  // Get existing translations
  const headlineTranslations = getExistingTranslations(study.headlineTranslation);
  const titleTranslations = getExistingTranslations(study.titleTranslation);
  const descriptionTranslations = getExistingTranslations(study.descriptionTranslation);

  // Find missing locales for each field
  const missingHeadlineLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !headlineTranslations[locale] && study.headline
  );
  const missingTitleLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !titleTranslations[locale] && study.title
  );
  const missingDescriptionLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !descriptionTranslations[locale] && study.description
  );

  const totalMissing = 
    missingHeadlineLocales.length +
    missingTitleLocales.length +
    missingDescriptionLocales.length;

  if (totalMissing === 0) {
    console.log(`  ⏭️  All translations already exist, skipping...`);
    return null;
  }

  console.log(`  📝 Generating ${totalMissing} missing translations...`);
  console.log(`     - Headline: ${missingHeadlineLocales.length} missing`);
  console.log(`     - Title: ${missingTitleLocales.length} missing`);
  console.log(`     - Description: ${missingDescriptionLocales.length} missing`);

  // Generate translations for missing locales
  for (const locale of missingHeadlineLocales) {
    if (study.headline) {
      headlineTranslations[locale] = await translateText(study.headline, locale, "headline");
      await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
    }
  }

  for (const locale of missingTitleLocales) {
    if (study.title) {
      titleTranslations[locale] = await translateText(study.title, locale, "title");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  for (const locale of missingDescriptionLocales) {
    if (study.description) {
      descriptionTranslations[locale] = await translateText(study.description, locale, "description");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return {
    headlineTranslation: Object.keys(headlineTranslations).length > 0 ? JSON.stringify(headlineTranslations) : null,
    titleTranslation: Object.keys(titleTranslations).length > 0 ? JSON.stringify(titleTranslations) : null,
    descriptionTranslation: Object.keys(descriptionTranslations).length > 0 ? JSON.stringify(descriptionTranslations) : null,
  };
}

async function generateTranslations() {
  console.log(`Fetching studies from database...`);
  console.log(`Configured locales: ${locales.join(", ")}\n`);

  const allStudies = await db
    .select({
      id: studies.id,
      headline: studies.headline,
      title: studies.title,
      authors: studies.authors,
      description: studies.description,
      year: studies.year,
      url: studies.url,
      displayUrl: studies.displayUrl,
      headlineTranslation: studies.headlineTranslation,
      titleTranslation: studies.titleTranslation,
      descriptionTranslation: studies.descriptionTranslation,
      processed: studies.processed,
    })
    .from(studies);

  console.log(`Found ${allStudies.length} studies to process\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allStudies.length; i++) {
    const study = allStudies[i];
    const headline = study.headline || "Untitled Study";
    console.log(`\n[${i + 1}/${allStudies.length}] Processing: ${headline.substring(0, 60)}...`);

    try {
      const translations = await generateMissingTranslations(study);

      if (!translations) {
        skippedCount++;
        continue;
      }

      // Update the study with new translations
      await db
        .update(studies)
        .set({
          headlineTranslation: translations.headlineTranslation,
          titleTranslation: translations.titleTranslation,
          descriptionTranslation: translations.descriptionTranslation,
          updatedAt: new Date(),
        })
        .where(eq(studies.id, study.id));

      console.log(`  ✅ Updated translations for study ID: ${study.id}`);
      updatedCount++;

      // Add delay between studies to avoid rate limiting
      if (i < allStudies.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ❌ Error processing study ${study.id}:`, error);
      errorCount++;
    }
  }

  console.log("\n📊 Translation Generation Summary:");
  console.log(`✅ Studies updated with translations: ${updatedCount}`);
  console.log(`⏭️  Studies skipped (already complete): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total: ${allStudies.length}`);
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
