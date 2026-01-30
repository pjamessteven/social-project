import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chatConversations } from "../db/schema";
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

interface ChatConversationWithTranslations {
  uuid: string;
  title: string | null;
  conversationSummary: string | null;
  titleTranslation: string | null;
  conversationSummaryTranslation: string | null;
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
): Promise<string> {
  const languageName = languageNames[targetLocale] || targetLocale;
  
  const prompt = `Translate the following conversation summary to ${languageName}. 
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
  titleTranslation: string | null;
  conversationSummaryTranslation: string | null;
}

async function generateMissingTranslations(conversation: ChatConversationWithTranslations): Promise<TranslationResult | null> {
  // Get existing translations
  const titleTranslations = getExistingTranslations(conversation.titleTranslation);
  const summaryTranslations = getExistingTranslations(conversation.conversationSummaryTranslation);

  // Find missing locales for title
  const missingTitleLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !titleTranslations[locale] && conversation.title
  );

  // Find missing locales for summary
  const missingSummaryLocales = locales.filter(
    (locale) => locale !== DEFAULT_LOCALE && !summaryTranslations[locale] && conversation.conversationSummary
  );

  const totalMissing = missingTitleLocales.length + missingSummaryLocales.length;

  if (totalMissing === 0) {
    console.log(`  ⏭️  All translations already exist, skipping...`);
    return null;
  }

  console.log(`  📝 Generating ${totalMissing} missing translations...`);
  if (missingTitleLocales.length > 0) {
    console.log(`     - Title: ${missingTitleLocales.length} missing`);
  }
  if (missingSummaryLocales.length > 0) {
    console.log(`     - Summary: ${missingSummaryLocales.length} missing`);
  }

  // Generate title translations
  for (const locale of missingTitleLocales) {
    if (conversation.title) {
      titleTranslations[locale] = await translateText(conversation.title, locale);
      await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
    }
  }

  // Generate summary translations
  for (const locale of missingSummaryLocales) {
    if (conversation.conversationSummary) {
      summaryTranslations[locale] = await translateText(conversation.conversationSummary, locale);
      await new Promise((resolve) => setTimeout(resolve, 200)); // Rate limiting
    }
  }

  return {
    titleTranslation: Object.keys(titleTranslations).length > 0 ? JSON.stringify(titleTranslations) : null,
    conversationSummaryTranslation: Object.keys(summaryTranslations).length > 0 ? JSON.stringify(summaryTranslations) : null,
  };
}

async function generateTranslations() {
  console.log(`Fetching featured chat conversations from database...`);
  console.log(`Configured locales: ${locales.join(", ")}\n`);

  // Only fetch featured conversations
  const featuredConversations = await db
    .select({
      uuid: chatConversations.uuid,
      title: chatConversations.title,
      conversationSummary: chatConversations.conversationSummary,
      titleTranslation: chatConversations.titleTranslation,
      conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
    })
    .from(chatConversations)
    .where(eq(chatConversations.featured, true));

  console.log(`Found ${featuredConversations.length} featured conversations to process\n`);

  if (featuredConversations.length === 0) {
    console.log("No featured conversations found. Mark some conversations as featured first.");
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let noSummaryCount = 0;
  let noTitleCount = 0;

  for (let i = 0; i < featuredConversations.length; i++) {
    const conversation = featuredConversations[i];
    const title = conversation.title || `Conversation ${conversation.uuid.substring(0, 8)}`;
    
    console.log(`\n[${i + 1}/${featuredConversations.length}] Processing: ${title.substring(0, 60)}...`);

    // Skip if no summary and no title exists
    if (!conversation.conversationSummary && !conversation.title) {
      console.log(`  ⚠️  No conversation summary or title exists, skipping...`);
      noSummaryCount++;
      noTitleCount++;
      continue;
    }

    try {
      const translations = await generateMissingTranslations(conversation);

      if (!translations) {
        skippedCount++;
        continue;
      }

      // Update the conversation with new translations
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (translations.titleTranslation) {
        updateData.titleTranslation = translations.titleTranslation;
      }
      
      if (translations.conversationSummaryTranslation) {
        updateData.conversationSummaryTranslation = translations.conversationSummaryTranslation;
      }

      await db
        .update(chatConversations)
        .set(updateData)
        .where(eq(chatConversations.uuid, conversation.uuid));

      console.log(`  ✅ Updated translations for conversation: ${conversation.uuid.substring(0, 8)}...`);
      updatedCount++;

      // Add delay between conversations to avoid rate limiting
      if (i < featuredConversations.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ❌ Error processing conversation ${conversation.uuid}:`, error);
      errorCount++;
    }
  }

  console.log("\n📊 Translation Generation Summary:");
  console.log(`✅ Conversations updated with translations: ${updatedCount}`);
  console.log(`⏭️  Conversations skipped (already complete): ${skippedCount}`);
  console.log(`⚠️  Conversations without summaries: ${noSummaryCount}`);
  console.log(`⚠️  Conversations without titles: ${noTitleCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total featured: ${featuredConversations.length}`);
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
