import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { OpenAI } from "openai";
import * as fs from "fs/promises";
import * as path from "path";

import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "../db/schema";

export const availableTags = [
  "trauma",
  "autism/neurodivergence",
  "adhd",
  "ocd intrusive thoughts",
  "puberty discomfort",
  "got top surgery",
  "got top surgery as part of male detransition",
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
  "porn influence",
  "anime influence",
  "influenced online",
  "influenced by friends",
  "hated breasts",
  "benefited from non-affirming therapy",
  "eating disorder",
  "parental or medical coercion",
  "completely regrets transition",
  "doesn't completely regret transition",
  "regrets hormones",
  "doesn't regret hormones",
  "regrets surgery",
  "doesn't regret surgery",
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
  "fear of sexualization",
  "psychosis clarity",
  "depersonalisation",
  "mental health issues",
  "underlying health issues",
  "suspicious account",
  "hair loss",
  "chronic pain",
  "weight gain/loss",
  "bone density issues",
  "unsupportive family",
  "supportive family",
  "is parent (not trans themselves)",
  "is friend (not trans themselves)",
  "is researcher (not trans themselves)",
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

const MODEL = "moonshotai/kimi-k2-0905"

// Progress tracking interface
interface ProcessingState {
  lastProcessedUser: string | null;
  completedUsers: string[];
  failedUsers: Array<{
    username: string;
    error: string;
    retryCount: number;
    lastAttempt: string;
  }>;
  startTime: string;
  totalUsers: number;
  processedCount: number;
}

// Error types for better handling
class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

class APIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "APIError";
  }
}

const PROGRESS_FILE = "/tmp/tag-generation-progress.json";

// Progress persistence functions
async function loadProgress(): Promise<ProcessingState> {
  try {
    const data = await fs.readFile(PROGRESS_FILE, "utf-8");
    const state = JSON.parse(data) as ProcessingState;
    console.log(`Loaded progress: ${state.processedCount}/${state.totalUsers} users processed`);
    console.log(`Failed users: ${state.failedUsers.length}`);
    return state;
  } catch (error) {
    console.log("No existing progress file found, starting fresh");
    return {
      lastProcessedUser: null,
      completedUsers: [],
      failedUsers: [],
      startTime: new Date().toISOString(),
      totalUsers: 0,
      processedCount: 0,
    };
  }
}

async function saveProgress(state: ProcessingState): Promise<void> {
  try {
    await fs.writeFile(PROGRESS_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
}

// Enhanced backoff utility with better error classification
async function fetchWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 500, // initial delay in ms
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err: any) {
      const isLastAttempt = attempt === retries;
      
      // Classify error types
      let classifiedError: Error;
      if (err.status === 429 || err.message?.includes("rate limit")) {
        classifiedError = new RateLimitError(err.message || "Rate limit exceeded");
      } else if (err.status >= 400 && err.status < 500) {
        classifiedError = new ValidationError(err.message || "Client error");
      } else if (err.status >= 500) {
        classifiedError = new APIError(err.message || "Server error");
      } else {
        classifiedError = err;
      }

      if (isLastAttempt) {
        throw classifiedError;
      }

      // Different backoff strategies for different error types
      let backoffMultiplier = 2;
      if (classifiedError instanceof RateLimitError) {
        backoffMultiplier = 3; // Longer backoff for rate limits
      }

      const backoff = delay * Math.pow(backoffMultiplier, attempt);
      console.warn(
        `Attempt ${attempt + 1} failed (${classifiedError.name}). Retrying in ${backoff}ms...`,
        classifiedError.message,
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt++;
    }
  }

  throw new Error("Unexpected error in fetchWithBackoff");
}


async function generateTags(
  username: string,
  experienceReport: string,
  redFlagsReport: string,
  userSex: string,
): Promise<string[]> {
  const prompt = `You are a medical annotator that accurately labels detransition stories with relevant labels.

LABELS = ${JSON.stringify(availableTags)}

RULES:
1. For every label you add, there must be ONE sentence that explicitly supports it.
2. You must only use labels from the list above, do NOT invent new labels.
3. Output only valid JSON.
4. Only use the 'suspicious account' tag if the Red Flag Report explicitly suspects the account is not authentic.
5. Only label with 'regrets transitioning' or 'doesn't regret transitioning' if there is a very strong sense of (or lack of) regret. 
6. Only label with 're-transitioned' if the story explicitly mentions re-transitioning after de-transitioning. 
7. Base sexuality on biological sex. If a male says their girlfriend is trans, this means their girlfriend is actually male, therefor they are homosexual. Likewise if a female says their boyfriend is trans, this means their boyfriend is actually female, therefor they are homosexual.
8. Consider the user's biological sex (${userSex}) when determining sexuality labels (homosexual/heterosexual/bisexual).
 
Story: """
${experienceReport}
"""

Red Flag Report: """
${redFlagsReport}
"""

Output format:
["trauma", "autism/neurodivergence"]`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      })
    );

    const result = response.choices[0]?.message?.content;
    if (!result) return [];

    // Parse the JSON response
    let tags: string[] = [];
    try {
      tags = JSON.parse(result);
      console.log(`Raw LLM response for ${username}:`, JSON.stringify(tags));
      
      if (!Array.isArray(tags)) {
        console.error(`Expected array but got ${typeof tags} for ${username}`);
        return [];
      }
    } catch (parseError) {
      console.error(`JSON parse error for ${username}:`, parseError);
      console.error(`Raw response:`, result);
      return [];
    }

   // console.log(`Extracted tags for ${username}:`, tags);

    // Validate and filter valid tags
    const validTags = tags.filter(tag => {
      const isString = typeof tag === 'string';
      const hasLength = tag && tag.trim().length > 0;
      const isAvailable = availableTags.includes(tag.toLowerCase());
      
      if (!isString) console.log(`  - Rejected ${tag}: not a string`);
      else if (!hasLength) console.log(`  - Rejected "${tag}": empty or whitespace`);
      else if (!isAvailable) console.log(`  - Rejected "${tag}": not in available tags list`);
      
      return isString && hasLength && isAvailable;
    });

  //  console.log(`Generated ${validTags.length} valid tags for ${username}:`, validTags);

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
  if (tagIds.length === 0) return;

  // Get existing tag IDs for this user
  const existingTags = await db
    .select({ tagId: detransUserTags.tagId })
    .from(detransUserTags)
    .where(eq(detransUserTags.username, username));
  
  const existingTagIds = new Set(existingTags.map(t => t.tagId));
  
  // Filter out tags that already exist for this user
  const newTagIds = tagIds.filter(tagId => !existingTagIds.has(tagId));
  
  // Insert only new tags
  if (newTagIds.length > 0) {
    await db.insert(detransUserTags).values(
      newTagIds.map(tagId => ({
        username,
        tagId,
      }))
    );
    console.log(`  Added ${newTagIds.length} new tags (${tagIds.length - newTagIds.length} already existed)`);
  } else {
    console.log(`  All ${tagIds.length} tags already exist for this user`);
  }
}

async function getUsersWithExperience(excludeUsernames: string[] = []): Promise<Array<{
  username: string;
  experience: string;
  redFlagsReport: string;
  sex: string;
}>> {
  console.log("Fetching users with experience data...");

  let query = sql`
    SELECT u.username, u.experience, u.red_flags_report, u.sex
    FROM detrans_users u
    WHERE u.experience IS NOT NULL
      AND u.experience != ''
  `;

  // Exclude already processed users
  if (excludeUsernames.length > 0) {
    query = sql`
      SELECT u.username, u.experience, u.red_flags_report, u.sex
      FROM detrans_users u
      WHERE u.experience IS NOT NULL
        AND u.experience != ''
        AND u.username NOT IN (${sql.raw(excludeUsernames.map(name => `'${name}'`).join(','))})
    `;
  }

  query = sql`${query} ORDER BY u.active_since DESC`;

  const result = await db.execute(query);

  return result.map((row) => ({
    username: row.username as string,
    experience: row.experience as string,
    redFlagsReport: (row.red_flags_report as string) || "",
    sex: row.sex as string,
  }));
}

async function getRetryableFailedUsers(state: ProcessingState, maxRetries: number = 3): Promise<Array<{
  username: string;
  experience: string;
  redFlagsReport: string;
  sex: string;
}>> {
  const retryableUsernames = state.failedUsers
    .filter(f => f.retryCount < maxRetries)
    .map(f => f.username);

  if (retryableUsernames.length === 0) {
    return [];
  }

  console.log(`Fetching ${retryableUsernames.length} failed users for retry...`);

  const placeholders = retryableUsernames.map(name => `'${name}'`).join(',');
  const result = await db.execute(sql`
    SELECT u.username, u.experience, u.red_flags_report, u.sex
    FROM detrans_users u
    WHERE u.username IN (${sql.raw(placeholders)})
      AND u.experience IS NOT NULL
      AND u.experience != ''
    ORDER BY u.active_since DESC
  `);

  return result.map((row) => ({
    username: row.username as string,
    experience: row.experience as string,
    redFlagsReport: (row.red_flags_report as string) || "",
    sex: row.sex as string,
  }));
}

async function processUser(
  user: {
    username: string;
    experience: string;
    redFlagsReport: string;
    sex: string;
  },
  index: number,
  total: number,
  state: ProcessingState,
): Promise<{ success: boolean; error?: string }> {
  const { username, experience, redFlagsReport, sex } = user;

  console.log(`[${index + 1}/${total}] Processing tags for user: ${username}`);

  try {
    // Validate user data
    if (!experience || experience.trim().length < 50) {
      throw new ValidationError("Experience text too short or empty");
    }

    if (experience.length > 50000) {
      throw new ValidationError("Experience text too long (may exceed token limits)");
    }

    // Generate tags
    const tags = await generateTags(username, experience, redFlagsReport, sex);

    if (tags.length > 0) {
      // Convert to lowercase for consistency
      const tagNames = tags.map(tag => tag.toLowerCase());
      
      console.log(`Assigning ${tagNames.length} tags to ${username}:`, tagNames);
      const tagIds = await ensureTagsExist(tagNames);
      await assignTagsToUser(username, tagIds);
    } else {
      console.log(`No tags generated for ${username}`);
    }

    // Update progress
    state.completedUsers.push(username);
    state.lastProcessedUser = username;
    state.processedCount++;

    console.log(`Successfully processed tags for user: ${username}`);

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    console.error(`Error processing user ${username}:`, errorMessage);

    // Find existing failed user entry or create new one
    const existingFailedIndex = state.failedUsers.findIndex(f => f.username === username);
    if (existingFailedIndex >= 0) {
      state.failedUsers[existingFailedIndex].retryCount++;
      state.failedUsers[existingFailedIndex].error = errorMessage;
      state.failedUsers[existingFailedIndex].lastAttempt = new Date().toISOString();
    } else {
      state.failedUsers.push({
        username,
        error: errorMessage,
        retryCount: 1,
        lastAttempt: new Date().toISOString(),
      });
    }

    return { success: false, error: errorMessage };
  }
}

async function main() {
  let state: ProcessingState | undefined;
  
  try {
    console.log("Starting user tag generation...");

    // Load existing progress
    state = await loadProgress();

    // Get users that need processing
    const newUsers = await getUsersWithExperience(state.completedUsers);
    const retryUsers = await getRetryableFailedUsers(state);
    
    // Combine new users and retry users
    const allUsers = [...retryUsers, ...newUsers];
    
    console.log(`Found ${newUsers.length} users with experience data and ${retryUsers.length} retry users to process`);
    console.log(`Total users to process: ${allUsers.length}`);

    if (allUsers.length === 0) {
      console.log("No users found to process. Exiting.");
      
      // Show summary of failed users
      if (state.failedUsers.length > 0) {
        console.log(`\nFailed users summary (${state.failedUsers.length} users):`);
        state.failedUsers.forEach(f => {
          console.log(`  - ${f.username}: ${f.error} (${f.retryCount} attempts)`);
        });
      }
      
      return;
    }

    // Update state with total users if this is a fresh start
    if (state.totalUsers === 0) {
      state.totalUsers = allUsers.length + state.completedUsers.length;
    }

    const startTime = Date.now();

    // Process users in batches to avoid overwhelming the API
    const batchSize = 5; // Reduced batch size for better error recovery
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allUsers.length / batchSize);
      
      console.log(
        `\nProcessing batch ${batchNumber}/${totalBatches} (Users ${i + 1}-${Math.min(i + batchSize, allUsers.length)} of ${allUsers.length})`,
      );

      // Process batch sequentially for better error handling
      for (let j = 0; j < batch.length; j++) {
        const user = batch[j];
        const globalIndex = i + j;
        
        const result = await processUser(user, globalIndex, allUsers.length, state);
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Save progress after each user
        await saveProgress(state);
      }
      
      // Calculate and display progress
      const elapsedTime = Date.now() - startTime;
      const totalProcessed = successCount + failureCount;
      const avgTimePerUser = totalProcessed > 0 ? elapsedTime / totalProcessed : 0;
      const remainingUsers = allUsers.length - totalProcessed;
      const estimatedTimeRemaining = avgTimePerUser * remainingUsers;
      
      const progressPercent = ((state.processedCount / state.totalUsers) * 100).toFixed(1);
      const etaMinutes = Math.round(estimatedTimeRemaining / 60000);
      
      console.log(`\nProgress Summary:`);
      console.log(`  - Batch: ${successCount} success, ${failureCount} failed`);
      console.log(`  - Overall: ${state.processedCount}/${state.totalUsers} users (${progressPercent}%)`);
      console.log(`  - Failed users: ${state.failedUsers.length}`);
      console.log(`  - ETA: ${etaMinutes} minutes`);

      // Longer delay between batches
      if (i + batchSize < allUsers.length) {
        console.log("Waiting before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 60000);
    console.log(`\nUser tag generation completed!`);
    console.log(`Total time: ${totalTime} minutes`);
    console.log(`Successfully processed: ${successCount} users`);
    console.log(`Failed: ${failureCount} users`);
    
    // Final save
    await saveProgress(state);

    // Show summary of failed users
    if (state.failedUsers.length > 0) {
      console.log(`\nFailed users summary (${state.failedUsers.length} users):`);
      state.failedUsers.forEach(f => {
        console.log(`  - ${f.username}: ${f.error} (${f.retryCount} attempts)`);
      });
    }

  } catch (error) {
    console.error("Error in main process:", error);
    
    // Save progress even on error
    if (state !== undefined) {
      await saveProgress(state);
    }
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
