import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { detransUsers } from "../db/schema";
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

interface UserWithTranslations {
  username: string;
  experience: string | null;
  experienceSummary: string | null;
  redFlagsReport: string | null;
  experienceTranslation: string | null;
  experienceSummaryTranslation: string | null;
  redFlagsReportTranslation: string | null;
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
  context: string = "detransition story"
): Promise<string> {
  const languageName = languageNames[targetLocale] || targetLocale;
  
  const prompt = `Translate the following ${context} to ${languageName}. 
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
      console.warn(`  ⚠️  Empty translation received for ${targetLocale}`);
      return text;
    }

    return translatedText;
  } catch (error) {
    console.error(`  ❌ Error translating to ${targetLocale}:`, error);
    return text;
  }
}

interface TranslationResult {
  experienceTranslation: string | null;
  experienceSummaryTranslation: string | null;
  redFlagsReportTranslation: string | null;
}

async function generateMissingTranslations(user: UserWithTranslations): Promise<TranslationResult | null> {
  // Get existing translations
  const experienceTranslations = getExistingTranslations(user.experienceTranslation);
  const summaryTranslations = getExistingTranslations(user.experienceSummaryTranslation);
  const redFlagsTranslations = getExistingTranslations(user.redFlagsReportTranslation);

  // Find missing locales for each field
  const missingExperienceLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !experienceTranslations[locale] && user.experience
  );

  const missingSummaryLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !summaryTranslations[locale] && user.experienceSummary
  );

  const missingRedFlagsLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !redFlagsTranslations[locale] && user.redFlagsReport
  );

  const totalMissing = missingExperienceLocales.length + missingSummaryLocales.length + missingRedFlagsLocales.length;

  if (totalMissing === 0) {
    console.log(`  ⏭️  All translations already exist, skipping...`);
    return null;
  }

  console.log(`  📝 Generating ${totalMissing} missing translations...`);
  if (missingExperienceLocales.length > 0) {
    console.log(`     - Experience: ${missingExperienceLocales.length} missing`);
  }
  if (missingSummaryLocales.length > 0) {
    console.log(`     - Summary: ${missingSummaryLocales.length} missing`);
  }
  if (missingRedFlagsLocales.length > 0) {
    console.log(`     - Red Flags: ${missingRedFlagsLocales.length} missing`);
  }

  // Generate experience translations
  for (const locale of missingExperienceLocales) {
    if (user.experience) {
      experienceTranslations[locale] = await translateText(user.experience, locale, "detransition story");
      await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
    }
  }

  // Generate summary translations
  for (const locale of missingSummaryLocales) {
    if (user.experienceSummary) {
      summaryTranslations[locale] = await translateText(user.experienceSummary, locale, "experience summary");
      await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
    }
  }

  // Generate red flags report translations
  for (const locale of missingRedFlagsLocales) {
    if (user.redFlagsReport) {
      redFlagsTranslations[locale] = await translateText(user.redFlagsReport, locale, "authenticity assessment");
      await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
    }
  }

  return {
    experienceTranslation: Object.keys(experienceTranslations).length > 0 ? JSON.stringify(experienceTranslations) : null,
    experienceSummaryTranslation: Object.keys(summaryTranslations).length > 0 ? JSON.stringify(summaryTranslations) : null,
    redFlagsReportTranslation: Object.keys(redFlagsTranslations).length > 0 ? JSON.stringify(redFlagsTranslations) : null,
  };
}

async function generateTranslations() {
  console.log(`Fetching detrans users from database...`);
  console.log(`Configured locales: ${locales.join(", ")}\n`);

  // Fetch all users with content to translate
  const users = await db
    .select({
      username: detransUsers.username,
      experience: detransUsers.experience,
      experienceSummary: detransUsers.experienceSummary,
      redFlagsReport: detransUsers.redFlagsReport,
      experienceTranslation: detransUsers.experienceTranslation,
      experienceSummaryTranslation: detransUsers.experienceSummaryTranslation,
      redFlagsReportTranslation: detransUsers.redFlagsReportTranslation,
    })
    .from(detransUsers);

  console.log(`Found ${users.length} users to process\n`);

  if (users.length === 0) {
    console.log("No users found in the database.");
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let noContentCount = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    console.log(`\n[${i + 1}/${users.length}] Processing user: ${user.username}`);

    // Skip if no content exists to translate
    if (!user.experience && !user.experienceSummary && !user.redFlagsReport) {
      console.log(`  ⚠️  No content exists to translate, skipping...`);
      noContentCount++;
      continue;
    }

    try {
      const translations = await generateMissingTranslations(user);

      if (!translations) {
        skippedCount++;
        continue;
      }

      // Update the user with new translations
      const updateData: any = {};
      
      if (translations.experienceTranslation) {
        updateData.experienceTranslation = translations.experienceTranslation;
      }
      
      if (translations.experienceSummaryTranslation) {
        updateData.experienceSummaryTranslation = translations.experienceSummaryTranslation;
      }

      if (translations.redFlagsReportTranslation) {
        updateData.redFlagsReportTranslation = translations.redFlagsReportTranslation;
      }

      await db
        .update(detransUsers)
        .set(updateData)
        .where(eq(detransUsers.username, user.username));

      console.log(`  ✅ Updated translations for user: ${user.username}`);
      updatedCount++;

      // Add delay between users to avoid rate limiting
      if (i < users.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ❌ Error processing user ${user.username}:`, error);
      errorCount++;
    }
  }

  console.log("\n📊 Translation Generation Summary:");
  console.log(`✅ Users updated with translations: ${updatedCount}`);
  console.log(`⏭️  Users skipped (already complete): ${skippedCount}`);
  console.log(`⚠️  Users without content: ${noContentCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total users: ${users.length}`);
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
