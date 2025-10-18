import * as dotenv from "dotenv";
import { eq, sql, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { OpenAI } from "openai";

import postgres from "postgres";
import { detransUsers, detransTags, detransTagTypes, detransUserTags } from "../db/schema";

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
    .innerJoin(detransTagTypes, eq(detransTags.id, detransTagTypes.tagId))
    .where(eq(detransTagTypes.type, 'transition reason'));
  
  return tags.map(tag => tag.name);
}

async function getDetransitionReasonTags(): Promise<string[]> {
  const tags = await db
    .select({ name: detransTags.name })
    .from(detransTags)
    .innerJoin(detransTagTypes, eq(detransTags.id, detransTagTypes.tagId))
    .where(eq(detransTagTypes.type, 'detransition reason'));
  
  return tags.map(tag => tag.name);
}

async function determineBothReasons(
  username: string,
  userExperience: string,
  userSex: string,
  availableTransitionTags: string[],
  availableDetransitionTags: string[]
): Promise<{ transitionReason: string; detransitionReason: string }> {
  const prompt = `Based on the following user experience from a detransitioner, determine BOTH:
1. The MAIN reason why they initially transitioned
2. The MAIN reason why they decided to detransition

Look for the primary underlying causes/motivations for each decision.

Available transition reason tags: ${availableTransitionTags.join(', ')}
Available detransition reason tags: ${availableDetransitionTags.join(', ')}

Note: autogynephilia can only apply to males, autoandrophilia can only apply to females.
The user's sex is "${userSex}"

User experience from "${username}":
${userExperience}

Instructions:
1. For each reason, if an available tag fits, use that exact tag name
2. If user did not transition or did not de-transition, return null instead of tag.
3. Focus on ROOT CAUSES and primary motivations
4. Return tag name in exact original format
5. Return ONLY the tag name after each label, nothing else
6. Return in this exact format:
TRANSITION_REASON: [tag name]
DETRANSITION_REASON: [tag name]`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 100,
      })
    );

    const result = response.choices[0]?.message?.content?.trim();
    
    // Parse the response
    const transitionMatch = result?.match(/TRANSITION_REASON:\s*(.+)/i);
    const detransitionMatch = result?.match(/DETRANSITION_REASON:\s*(.+)/i);
    
    return {
      transitionReason: transitionMatch?.[1]?.trim().toLowerCase() || "unknown",
      detransitionReason: detransitionMatch?.[1]?.trim().toLowerCase() || "unknown"
    };
  } catch (error) {
    console.error(`Error determining reasons for ${username}:`, error);
    return { transitionReason: "unknown", detransitionReason: "unknown" };
  }
}

async function ensureTagExists(tagName: string, tagType: 'transition reason' | 'detransition reason'): Promise<number> {
  // Check if tag exists
  const existingTag = await db
    .select()
    .from(detransTags)
    .where(eq(detransTags.name, tagName))
    .limit(1);
  
  let tagId: number;
  
  if (existingTag.length === 0) {
    // Create new tag
    console.log(`Creating new tag: "${tagName}"`);
    const newTag = await db
      .insert(detransTags)
      .values({ name: tagName })
      .returning({ id: detransTags.id });
    tagId = newTag[0].id;
  } else {
    tagId = existingTag[0].id;
  }
  
  // Check if this tag already has this type
  const existingTagType = await db
    .select()
    .from(detransTagTypes)
    .where(
      sql`${detransTagTypes.tagId} = ${tagId} AND ${detransTagTypes.type} = ${tagType}`
    )
    .limit(1);
  
  if (existingTagType.length === 0) {
    // Add the type to this tag
    console.log(`Adding type "${tagType}" to tag "${tagName}"`);
    await db
      .insert(detransTagTypes)
      .values({
        tagId: tagId,
        type: tagType
      });
  }
  
  return tagId;
}

async function ensureUserTagRelation(username: string, tagId: number): Promise<void> {
  // Check if user-tag relation already exists
  const existingRelation = await db
    .select()
    .from(detransUserTags)
    .where(
      sql`${detransUserTags.username} = ${username} AND ${detransUserTags.tagId} = ${tagId}`
    )
    .limit(1);
  
  if (existingRelation.length === 0) {
    // Create the user-tag relation
    console.log(`Creating user-tag relation for ${username} and tag ID ${tagId}`);
    await db
      .insert(detransUserTags)
      .values({
        username: username,
        tagId: tagId
      });
  } else {
    console.log(`User-tag relation already exists for ${username} and tag ID ${tagId}`);
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

    // Get available tags for both types
    const availableTransitionTags = await getTransitionReasonTags();
    const availableDetransitionTags = await getDetransitionReasonTags();
    
    console.log(`Available transition reason tags: ${availableTransitionTags.length} tags`);
    console.log(`Available detransition reason tags: ${availableDetransitionTags.length} tags`);

    // Determine both reasons in a single API call
    const { transitionReason, detransitionReason } = await determineBothReasons(
      username, 
      experience, 
      sex, 
      availableTransitionTags, 
      availableDetransitionTags
    );

    // Process transition reason if not already assigned
    if (!hasTransitionReason && transitionReason && transitionReason !== "unknown") {
      console.log(`Determined transition reason for ${username}: "${transitionReason}"`);
      const transitionTagId = await ensureTagExists(transitionReason, 'transition reason');
      updates.transitionReasonId = transitionTagId;
      console.log(`Will update ${username} with transition reason ID: ${transitionTagId}`);
    } else if (!hasTransitionReason) {
      console.log(`Could not determine transition reason for ${username}`);
    }

    // Process detransition reason if not already assigned
    if (!hasDetransitionReason && detransitionReason && detransitionReason !== "unknown") {
      console.log(`Determined detransition reason for ${username}: "${detransitionReason}"`);
      const detransitionTagId = await ensureTagExists(detransitionReason, 'detransition reason');
      updates.detransitionReasonId = detransitionTagId;
      console.log(`Will update ${username} with detransition reason ID: ${detransitionTagId}`);
    } else if (!hasDetransitionReason) {
      console.log(`Could not determine detransition reason for ${username}`);
    }

    // Update user with any new reason IDs
    if (Object.keys(updates).length > 0) {
      await db
        .update(detransUsers)
        .set(updates)
        .where(eq(detransUsers.username, username));

      console.log(`Updated ${username} with:`, updates);

      // Create user-tag relations for the assigned reasons
      if (updates.transitionReasonId) {
        await ensureUserTagRelation(username, updates.transitionReasonId);
      }
      if (updates.detransitionReasonId) {
        await ensureUserTagRelation(username, updates.detransitionReasonId);
      }
    }

    // Add delay between API calls (now only one call per user)
    await new Promise((resolve) => setTimeout(resolve, 1000));

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
