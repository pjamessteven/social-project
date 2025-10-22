import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { OpenAI } from "openai";
import * as fs from "fs/promises";
import * as path from "path";

import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "../db/schema";

export const availableTags = [
  "trans kid",
  "feminine boy",
  "tomboy",
  "puberty discomfort",
  "internalised homophobia",
  "internalised misogyny",
  "internalised misandry",
  "autogynephilia",
  "autoandrophilia",
  "started as non-binary",
  "trauma",
  "social role discomfort",
  "fear of sexualization",
  "autism/neurodivergence",
  "mental health issues",
  "adhd",
  "ocd intrusive thoughts",
  "escapism",
  "depression",
  "low self-esteem",  
  "body dysmorphia",
  "eating disorder",
  "social anxiety and isolation",
  "bipolar",
  "borderline personality disorder",
  "suicidal ideation",
  "self-harmed",
  "porn influence",
  "anime influence",
  "influenced online",
  "influenced by friends",
  "benefited from non-affirming therapy",
  "psychosis clarity",
  "parental or medical coercion",
  "took hormones",
  "took puberty blockers",
  "got top surgery",
  "got facial surgery",
  "got bottom surgery",
  "only transitioned socially",
  "regrets social transition",
  "regrets medical transition",
  "doesn't regret social transition",
  "doesn't regret medical transition",
  "surgery complications",
  "other medical complications",
  "is now infertile",
  "re-transitioned",
  "benefited from psychedelic drugs",
  "had religious background",
  "became religious",
  "had unsupportive family",
  "had supportive family",
  "never transitioned",
  "intersex",
  "asexual",
  "homosexual",
  "heterosexual",
  "bisexual",
  "sexuality changed",
  "suspicious account",
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

const MODEL = "deepseek/deepseek-chat-v3.1"

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
  const systemPrompt = `You are a medical annotator specializing in detransition story analysis. Your task is to accurately label stories with relevant tags based on explicit evidence in the text.

AVAILABLE TAGS: ${JSON.stringify(availableTags)}

LABELING RULES:
1. Only use tags from the provided list - never invent new ones
2. Each tag must be supported by at least one explicit sentence in the story
3. Output only valid JSON array format: ["tag1", "tag2"]
4. Consider biological sex (${userSex}) for sexuality labels:
   - If male mentions trans girlfriend → homosexual (trans girlfriend is biologically male)
   - If female mentions trans boyfriend → homosexual (trans boyfriend is biologically female)
5. Surgery definitions:
   - "got bottom surgery": vaginoplasty, phalloplasty, hysterectomy
   - "got top surgery": mastectomy, breast implants
6. Only use "suspicious account" if Red Flag Report explicitly questions authenticity
7. Only use "re-transitioned" if story explicitly mentions transitioning again after detransitioning

Be precise and evidence-based in your labeling.`;

  const userPrompt = `Story:
"""
${experienceReport}
"""

Red Flag Report:
"""
${redFlagsReport}
"""

Provide the appropriate tags as a JSON array.`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
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
