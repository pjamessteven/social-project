import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { OpenAI } from "openai";

import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "../db/schema";

export const availableTags = [
  "trauma",
  "autism/neurodivergence",
  "adhd",
  "ocd intrusive thoughts",
  "puberty discomfort",
  "got top surgery",
  "got bottom surgery",
  "internalised homophobia",
  "internalised misogyny",
  "internalised misandry",
  "autogynephilia",
  "autoandrophilia",
  "started as non-binary",
  "escapism",
  "depression",
  "low self-esteem",
  "social anxiety and isolation",
  "bipolar",
  "borderline personality disorder",
  "suicidal ideation",
  "self-harm",
  "porn problem",
  "hated breasts",
  "benefited from non-affirming therapy",
  "eating disorder",
  "influenced online",
  "influenced by friends",
  "parental or medical coercion",
  "regrets transitioning",
  "doesn't regret transitioning",
  "trans kid",
  "feminine boy",
  "tomboy",
  "took hormones",
  "DIY hormones",
  "took puberty blockers",
  "surgery complications",
  "medical complications",
  "now infertile",
  "body dysmorphia",
  "re-transitioned",
  "rapid onset gender dysphoria (ROGD)",
  "benefited from psychedelic drugs",
  "had religious background",
  "became religious",
  "only transitioned socially",
  "intersex",
  "asexual",
  "homosexual",
  "heterosexual",
  "bisexual",
  "sexuality changed",
  "social role discomfort",
  "identity instability",
  "fear of sexualization",
  "psychosis clarity",
  "depersonalisation",
  "mental health issues",
  "identity validation pressure",
  "underlying health issues",
  "suspicious account",
  "hair loss",
  "chronic pain",
  "weight gain/loss",
  "bone density issues",
  "unsupportive family",
  "supportive family",
];

dotenv.config();

// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

// OpenAI client configured for DeepSeek
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const MODEL = "deepseek/deepseek-chat-v3-0324:free"

// Backoff utility for API calls
async function fetchWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 500, // initial delay in ms
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) {
        throw err; // out of retries, rethrow the error
      }

      const backoff = delay * Math.pow(2, attempt); // exponential backoff
      console.warn(
        `Attempt ${attempt + 1} failed. Retrying in ${backoff}ms...`,
        err,
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt++;
    }
  }

  // should never reach here
  throw new Error("Unexpected error in fetchWithBackoff");
}

interface TagWithEvidence {
  tag: string;
  quote: string;
}

async function generateTagsWithEvidence(
  username: string,
  experienceReport: string,
  redFlagsReport: string,
): Promise<TagWithEvidence[]> {
  const prompt = `You are a medical annotator that labels detransition stories.

LABELS = ${JSON.stringify(availableTags)}

RULES:
1. Reread the story twice.
2. For every tag you add, copy ONE verbatim sentence that explicitly supports it.
3. If no sentence supports a label, you MUST NOT invent one.
4. Output only valid JSON.
5. Only use the 'suspicious account' tag if the Red Flag Report explicitly suspects the account is not authentic.

Story: """
${experienceReport}
"""

Red Flag Report: """
${redFlagsReport}
"""

Output format:
[
  {"tag": "got top surgery",
   "quote": "I had double-incision mastectomy in 2021"},
  {"tag": "now infertile",
   "quote": "My endocrinologist confirmed my AMH is post-menopausal"}
]`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      })
    );

    const result = response.choices[0]?.message?.content;
    if (!result) return [];

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      console.error(`JSON parse error for ${username}:`, parseError);
      return [];
    }

    // Handle different possible response formats
    let tagsWithEvidence: TagWithEvidence[] = [];
    if (Array.isArray(parsed)) {
      tagsWithEvidence = parsed;
    } else if (parsed.tags && Array.isArray(parsed.tags)) {
      tagsWithEvidence = parsed.tags;
    } else if (typeof parsed === "object") {
      // Try to find an array property
      const arrayProp = Object.values(parsed).find((val) => Array.isArray(val));
      if (arrayProp) tagsWithEvidence = arrayProp as TagWithEvidence[];
    }

    // Validate the structure and filter valid tags
    const validTags = tagsWithEvidence.filter(item => 
      item && 
      typeof item === 'object' && 
      typeof item.tag === 'string' && 
      typeof item.quote === 'string' &&
      item.tag.trim().length > 0 &&
      item.quote.trim().length > 0
    );

    console.log(`Generated ${validTags.length} tags with evidence for ${username}`);
    validTags.forEach(({ tag, quote }) => {
      console.log(`  - ${tag}: "${quote.substring(0, 100)}${quote.length > 100 ? '...' : ''}"`);
    });

    return validTags;
  } catch (error) {
    console.error(`Error generating tags for ${username}:`, error);
    return [];
  }
}

async function ensureTagsExist(tagNames: string[]): Promise<number[]> {
  const tagIds: number[] = [];
  
  for (const tagName of tagNames) {
    // Check if tag exists
    const existingTag = await db
      .select()
      .from(detransTags)
      .where(eq(detransTags.name, tagName))
      .limit(1);
    
    if (existingTag.length === 0) {
      // Create new tag
      const newTag = await db
        .insert(detransTags)
        .values({ name: tagName })
        .returning({ id: detransTags.id });
      tagIds.push(newTag[0].id);
    } else {
      tagIds.push(existingTag[0].id);
    }
  }
  
  return tagIds;
}

async function assignTagsToUser(username: string, tagIds: number[]): Promise<void> {
  // Remove existing tags for this user
  await db.delete(detransUserTags).where(eq(detransUserTags.username, username));
  
  // Insert new tags
  if (tagIds.length > 0) {
    await db.insert(detransUserTags).values(
      tagIds.map(tagId => ({
        username,
        tagId,
      }))
    );
  }
}

async function getUsersWithoutTags(): Promise<Array<{
  username: string;
  experience: string;
  redFlagsReport: string;
}>> {
  console.log("Fetching users without tags...");

  const result = await db.execute(sql`
    SELECT u.username, u.experience, u.red_flags_report
    FROM detrans_users u
    LEFT JOIN detrans_user_tags ut ON u.username = ut.username
    WHERE ut.username IS NULL
      AND u.experience IS NOT NULL
      AND u.experience != ''
    ORDER BY u.active_since DESC
  `);

  return result.map((row) => ({
    username: row.username as string,
    experience: row.experience as string,
    redFlagsReport: (row.red_flags_report as string) || "",
  }));
}

async function processUser(user: {
  username: string;
  experience: string;
  redFlagsReport: string;
}, index: number, total: number): Promise<void> {
  const { username, experience, redFlagsReport } = user;

  console.log(`[${index + 1}/${total}] Processing tags for user: ${username}`);

  try {
    // Generate tags with evidence
    const tagsWithEvidence = await generateTagsWithEvidence(username, experience, redFlagsReport);

    if (tagsWithEvidence.length > 0) {
      // Extract just the tag names
      const tagNames = tagsWithEvidence.map(item => item.tag.toLowerCase());
      
      console.log(`Assigning tags to ${username}:`, tagNames);
      const tagIds = await ensureTagsExist(tagNames);
      await assignTagsToUser(username, tagIds);
    } else {
      console.log(`No tags generated for ${username}`);
    }

    console.log(`Successfully processed tags for user: ${username}`);

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`Error processing user ${username}:`, error);
  }
}

async function main() {
  try {
    console.log("Starting user tag generation...");

    const users = await getUsersWithoutTags();
    console.log(`Found ${users.length} users without tags to process`);

    if (users.length === 0) {
      console.log("No users found without tags. Exiting.");
      return;
    }

    const startTime = Date.now();
    let processedCount = 0;

    // Process users in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(users.length / batchSize);
      
      console.log(
        `Processing batch ${batchNumber}/${totalBatches} (Users ${i + 1}-${Math.min(i + batchSize, users.length)} of ${users.length})`,
      );

      await Promise.all(batch.map((user, batchIndex) => processUser(user, i + batchIndex, users.length)));

      processedCount += batch.length;
      
      // Calculate and display progress
      const elapsedTime = Date.now() - startTime;
      const avgTimePerUser = elapsedTime / processedCount;
      const remainingUsers = users.length - processedCount;
      const estimatedTimeRemaining = avgTimePerUser * remainingUsers;
      
      const progressPercent = ((processedCount / users.length) * 100).toFixed(1);
      const etaMinutes = Math.round(estimatedTimeRemaining / 60000);
      
      console.log(`Progress: ${processedCount}/${users.length} users (${progressPercent}%) - ETA: ${etaMinutes} minutes`);

      // Longer delay between batches
      if (i + batchSize < users.length) {
        console.log("Waiting before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 60000);
    console.log(`User tag generation completed! Total time: ${totalTime} minutes`);
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
