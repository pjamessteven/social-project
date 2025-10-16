import * as dotenv from "dotenv";
import { eq, sql, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { OpenAI } from "openai";

import postgres from "postgres";
import { detransUsers, detransTags } from "../db/schema";

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

const MODEL = "deepseek/deepseek-chat-v3.1";

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

async function getTransitionReasonTags(): Promise<string[]> {
  const tags = await db
    .select({ name: detransTags.name })
    .from(detransTags)
    .where(eq(detransTags.type, 'transition reason'));
  
  return tags.map(tag => tag.name);
}

async function getDetransitionReasonTags(): Promise<string[]> {
  const tags = await db
    .select({ name: detransTags.name })
    .from(detransTags)
    .where(eq(detransTags.type, 'detransition reason'));
  
  return tags.map(tag => tag.name);
}

async function determineTransitionReason(
  username: string,
  userExperience: string,
  userSex: string,
  availableReasonTags: string[]
): Promise<string> {
  const prompt = `Based on the following user experience from a detransitioner, determine the MAIN reason why they initially transitioned. 

Look for the primary underlying cause or motivation that led them to transition in the first place. This could be psychological, social, medical, or other factors.
Prioritize using one of the available transition reason tags. 

Available transition reason tags: ${availableReasonTags.join(', ')}
autogynephilia can only apply to males. 
autoandrophilia can only apply to females.

The user's sex is "${userSex}"

User experience from "${username}":
${userExperience}

Instructions:
1. If one of the available tags accurately describes their main transition reason, return that exact tag name.
2. If none of the available tags fit well, create a new descriptive tag (1-4 words, lowercase) that captures their main transition reason.
3. Focus on the ROOT CAUSE, not just symptoms or later developments.
4. Return ONLY the tag name, nothing else.

Tag:`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      })
    );

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    return result || "unknown";
  } catch (error) {
    console.error(`Error determining transition reason for ${username}:`, error);
    return "unknown";
  }
}

async function determineDetransitionReason(
  username: string,
  userExperience: string,
  userSex: string,
  availableReasonTags: string[]
): Promise<string> {
  const prompt = `Based on the following user experience from a detransitioner, determine the MAIN reason why they decided to detransition.

Look for the primary motivation or realization that led them to stop transitioning and return to their birth sex. This could be medical complications, regret, changed understanding, social factors, etc.
Prioritize using one of the available detransition reason tags.

Available detransition reason tags: ${availableReasonTags.join(', ')}

The user's sex is "${userSex}"

User experience from "${username}":
${userExperience}

Instructions:
1. If one of the available tags accurately describes their main detransition reason, return that exact tag name.
2. If none of the available tags fit well, create a new descriptive tag (1-4 words, lowercase) that captures their main detransition reason.
3. Focus on what specifically motivated them to detransition, not their original transition reasons.
4. Return ONLY the tag name, nothing else.

Tag:`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      })
    );

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    return result || "unknown";
  } catch (error) {
    console.error(`Error determining detransition reason for ${username}:`, error);
    return "unknown";
  }
}

async function ensureTagExists(tagName: string, tagType: 'transition reason' | 'detransition reason'): Promise<number> {
  // Check if tag exists
  const existingTag = await db
    .select()
    .from(detransTags)
    .where(eq(detransTags.name, tagName))
    .limit(1);
  
  if (existingTag.length === 0) {
    // Create new tag with specified type
    console.log(`Creating new ${tagType} tag: "${tagName}"`);
    const newTag = await db
      .insert(detransTags)
      .values({ 
        name: tagName,
        type: tagType
      })
      .returning({ id: detransTags.id });
    return newTag[0].id;
  } else {
    return existingTag[0].id;
  }
}

async function processUser(user: any, index: number, total: number): Promise<void> {
  const { username, experience, sex, transitionReasonId, detransitionReasonId } = user;

  console.log(`[${index + 1}/${total}] Processing user: ${username}`);

  // Skip if user has no experience text
  if (!experience || experience.trim().length === 0) {
    console.log(`User ${username} has no experience text, skipping...`);
    return;
  }

  // Check if both reasons are already assigned
  const hasTransitionReason = transitionReasonId !== null;
  const hasDetransitionReason = detransitionReasonId !== null;

  if (hasTransitionReason && hasDetransitionReason) {
    console.log(`User ${username} already has both reasons assigned, skipping...`);
    return;
  }

  try {
    let updates: any = {};

    // Process transition reason if not assigned
    if (!hasTransitionReason) {
      const availableTransitionTags = await getTransitionReasonTags();
      console.log(`Available transition reason tags: ${availableTransitionTags.length} tags`);

      const transitionReasonTag = await determineTransitionReason(username, experience, sex, availableTransitionTags);
      
      if (transitionReasonTag && transitionReasonTag !== "unknown") {
        console.log(`Determined transition reason for ${username}: "${transitionReasonTag}"`);
        const transitionTagId = await ensureTagExists(transitionReasonTag, 'transition reason');
        updates.transitionReasonId = transitionTagId;
        console.log(`Will update ${username} with transition reason ID: ${transitionTagId}`);
      } else {
        console.log(`Could not determine transition reason for ${username}`);
      }

      // Add delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Process detransition reason if not assigned
    if (!hasDetransitionReason) {
      const availableDetransitionTags = await getDetransitionReasonTags();
      console.log(`Available detransition reason tags: ${availableDetransitionTags.length} tags`);

      const detransitionReasonTag = await determineDetransitionReason(username, experience, sex, availableDetransitionTags);
      
      if (detransitionReasonTag && detransitionReasonTag !== "unknown") {
        console.log(`Determined detransition reason for ${username}: "${detransitionReasonTag}"`);
        const detransitionTagId = await ensureTagExists(detransitionReasonTag, 'detransition reason');
        updates.detransitionReasonId = detransitionTagId;
        console.log(`Will update ${username} with detransition reason ID: ${detransitionTagId}`);
      } else {
        console.log(`Could not determine detransition reason for ${username}`);
      }

      // Add delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Update user with any new reason IDs
    if (Object.keys(updates).length > 0) {
      await db
        .update(detransUsers)
        .set(updates)
        .where(eq(detransUsers.username, username));

      console.log(`Updated ${username} with:`, updates);
    }

  } catch (error) {
    console.error(`Error processing user ${username}:`, error);
  }
}

async function main() {
  try {
    console.log("Starting transition reason determination...");

    // Get all users without transition reasons or detransition reasons
    const users = await db
      .select({
        username: detransUsers.username,
        experience: detransUsers.experience,
        sex: detransUsers.sex,
        transitionReasonId: detransUsers.transitionReasonId,
        detransitionReasonId: detransUsers.detransitionReasonId,
      })
      .from(detransUsers)
      .where(
        sql`${detransUsers.transitionReasonId} IS NULL OR ${detransUsers.detransitionReasonId} IS NULL`
      );

    console.log(`Found ${users.length} users missing transition or detransition reasons`);

    if (users.length === 0) {
      console.log("No users need transition or detransition reason determination. Exiting.");
      return;
    }

    const startTime = Date.now();

    // Process users sequentially to avoid overwhelming the API
    for (let i = 0; i < users.length; i++) {
      await processUser(users[i], i, users.length);
      
      // Calculate and display progress
      const elapsedTime = Date.now() - startTime;
      const avgTimePerUser = elapsedTime / (i + 1);
      const remainingUsers = users.length - (i + 1);
      const estimatedTimeRemaining = avgTimePerUser * remainingUsers;
      
      const progressPercent = (((i + 1) / users.length) * 100).toFixed(1);
      const etaMinutes = Math.round(estimatedTimeRemaining / 60000);
      
      console.log(`Progress: ${i + 1}/${users.length} users (${progressPercent}%) - ETA: ${etaMinutes} minutes`);
    }

    const totalTime = Math.round((Date.now() - startTime) / 60000);
    console.log(`Reason determination completed! Total time: ${totalTime} minutes`);

    // Show summary of created tags
    const transitionReasonTags = await getTransitionReasonTags();
    const detransitionReasonTags = await getDetransitionReasonTags();
    console.log(`\nTotal transition reason tags in database: ${transitionReasonTags.length}`);
    console.log("Transition reason tags:", transitionReasonTags.join(', '));
    console.log(`\nTotal detransition reason tags in database: ${detransitionReasonTags.length}`);
    console.log("Detransition reason tags:", detransitionReasonTags.join(', '));

  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
