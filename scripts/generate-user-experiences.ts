import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { OpenAI } from "openai";

import { availableTags } from "@/app/lib/availableTags";
import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "../db/schema";

dotenv.config();

// Database connection
const connectionString = "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

// OpenAI client configured for DeepSeek
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const MODEL = "moonshotai/kimi-k2"

// Rough estimate: 1 token ≈ 4 characters for English text
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 2.5;
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars) + "...";
}

interface UserComments {
  username: string;
  comment_count: number;
  all_comments: string;
  all_comment_dates: string;
  earliest_comment_date: Date;
}

async function getUserComments(): Promise<UserComments[]> {
  console.log("Fetching user comments from database...");

  const result = await db.execute(sql`
    SELECT 
      username,
      COUNT(*) as comment_count,
      STRING_AGG(text, ' | ' ORDER BY created) as all_comments,
      STRING_AGG(created::text, ' | ' ORDER BY created) as all_comment_dates,
      MIN(created) as earliest_comment_date
    FROM detrans_comments 
    WHERE username IS NOT NULL 
      AND username != '[deleted]'
    GROUP BY username 
    ORDER BY comment_count DESC
    LIMIT 15
  `);

  return result.map((row) => ({
    username: row.username as string,
    comment_count: Number(row.comment_count),
    all_comments: row.all_comments as string,
    all_comment_dates: row.all_comment_dates as string,
    earliest_comment_date: new Date(row.earliest_comment_date as string),
  }));
}

async function generateExperienceReport(
  username: string,
  comments: string,
): Promise<string> {
  // Limit comments to stay within token limit (leave room for prompt + response)
  const truncatedComments = truncateToTokenLimit(comments, 260000);

  const prompt = `You are a user in an online detransition support community and you are summarising your experiences to be shared in an online archive. 
  Write a detailed plain-word first-person summary from your own comments about your whole transition journey from start to finish. 
  
  For example, if this information is available, what you were like before you transitioned, did you have underlying issues, what made you transition, what was it like, were you happy, what made you begin detransitioning, what is your sexual orientation and has it changed, what do you think of gender now, are you better now, etc. 
  
  Use a table to show your timeline of transition/detransition at the end of your response. 

  **Use only your past experiences from your previous comments** 
  **Provide as much information as possible** 
  **Do not make things up or get information from outside sources**
  
  TONE AND STYLE
  Speak in the first person (“I…”) and summarise the comments below in your own voice, as if you were telling a friend what everyone said about you.
  If you are a parent, write about your childs transition, not your own. 
  Do not refer to yourself by your username.
  Never use third person or meta-language such as “the comments show…” or “people think…”.
  Don't use the terms AFAB or AMAB. Just say male or female. Or born male/born female, if you have to.
  Use plain and simple language that clearly reflects the your real experiences.

  Your previous Comments: ${truncatedComments}
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error(`Error generating experience report for ${username}:`, error);
    return "";
  }
}

async function generateRedFlagsReport(
  username: string,
  comments: string,
): Promise<string> {
  // Limit comments to stay within token limit (leave room for prompt + response)
  const truncatedComments = truncateToTokenLimit(comments, 260000);

  const prompt = `You are analyzing comments from a user named "${username}" from /r/detrans on reddit. 
  Based on their comments, is this user account authentic? 
  Are there any serious red flags that suggest that this account could possibly be a bot, not a real person, or not a de-transitioner or desister? 
  Remember that detransitioners and desisters can be very passionate and pissed off about this topic because of the harm and stigma.
  Remember that you can still be a desister without medically transitioning.
  If you are sure that this is potentially an inauthentic account, explain the red flags if there are any.

  Keep your answer as short as possible.

  All User Comments in /r/detrans: ${truncatedComments}
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error(`Error generating experience report for ${username}:`, error);
    return "";
  }
}

async function generateExperienceSummary(
  experienceReport: string,
): Promise<string> {
  const prompt = `You are a commenter in an online detransition support forum. Summarize your experiences in exactly 5 sentences or fewer. 
  At first Focus on who you are, where you're from (only if specified), and how it started.  
  Explain the most important aspects of your journey, and where you are at now.
  Don't use the terms AFAB or AMAB. Just say male or female.

  TONE AND STYLE
  Speak in the first person (“I…”) and summarise the comments below in your own voice, as if you were telling a friend what everyone said about you.
  Never use third person or meta-language such as “the comments show…” or “people think…”.
  Do not refer to yourself by your username. 
  Use plain and simple language that clearly reflects the your real experiences.

  ${experienceReport}

  Summary (5 sentences max):`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating experience summary:", error);
    return "";
  }
}

async function determineBirthSex(
  username: string,
  comments: string,
): Promise<"m" | "f"> {
  const prompt = `Based on the following comments from a detransition community user, determine their birth sex (biological sex assigned at birth). Look for explicit mentions of their birth sex, transition direction (FTM/MTF), or other clear indicators.

Comments from user "${username}": ${comments.substring(0, 2000)}...

Respond with only "m" for male or "f" for female birth sex. If unclear, make your best inference based on transition patterns mentioned.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    return result === "m" || result === "male" ? "m" : "f";
  } catch (error) {
    console.error(`Error determining birth sex for ${username}:`, error);
    return "f"; // Default fallback
  }
}

async function generateTags(
  username: string,
  comments: string,
  redFlagsReport: string,
): Promise<string[]> {
  const prompt = `Based on the following comments from a detransition community user, identify which of these predetermined tags apply to their experience. 
Only select tags that are clearly supported by the content and are directly relevant to the user.
For example, only include 'infertility' if the user is actually now infertile, or 'bottom surgery' if the user had bottom surgery.
Only use the 'suspicious account' tag if the redFlagsReport suspects that this account might not be authentic. 

Available tags: ${availableTags.join(", ")}

Comments from user "${username}": ${comments.substring(0, 3000)}...
Red flag report of comments : ${redFlagsReport}...

Return only a JSON array of applicable tags. Example: ["trauma", "top surgery", "autism"]`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) return [];

    // Parse the JSON response
    const parsed = JSON.parse(result);

    // Handle different possible response formats
    let tagNames: string[] = [];
    if (Array.isArray(parsed)) {
      tagNames = parsed;
    } else if (parsed.tags && Array.isArray(parsed.tags)) {
      tagNames = parsed.tags;
    } else if (typeof parsed === "object") {
      // Try to find an array property
      const arrayProp = Object.values(parsed).find((val) => Array.isArray(val));
      if (arrayProp) tagNames = arrayProp as string[];
    }

    // Filter to only include predefined tags
    return tagNames.filter((tag) => availableTags.includes(tag.toLowerCase()));
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

async function processUser(userComments: UserComments): Promise<void> {
  const { username, all_comments, earliest_comment_date } = userComments;

  console.log(
    `Processing user: ${username} (${userComments.comment_count} comments)`,
  );

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(detransUsers)
    .where(eq(detransUsers.username, username))
    .limit(1);

  // Check if user has tags
  const existingTags = await db
    .select()
    .from(detransUserTags)
    .where(eq(detransUserTags.username, username));

  if (existingUser.length > 0 && existingTags.length > 0) {
    console.log(`User ${username} already exists with tags, skipping...`);
    return;
  }

  const userExists = existingUser.length > 0;
  if (userExists && existingTags.length === 0) {
    console.log(`User ${username} exists but has no tags, generating tags...`);
  }

  try {
    let experienceReport: string;
    let redFlagsReport: string;

    if (userExists) {
      // User exists, use existing experience report for tag generation
      experienceReport = existingUser[0].experience || all_comments;
      redFlagsReport = existingUser[0].redFlagsReport || "";
    } else {
      // Generate experience report for new user
      console.log(`Generating experience report for ${username}...`);
      experienceReport = await generateExperienceReport(
        username,
        all_comments,
      );

      if (!experienceReport) {
        console.log(
          `Failed to generate experience report for ${username}, skipping...`,
        );
        return;
      }

      redFlagsReport = await generateRedFlagsReport(username, all_comments);

      // Generate summary
      console.log(`Generating experience summary for ${username}...`);
      const experienceSummary = await generateExperienceSummary(experienceReport);

      // Determine birth sex
      console.log(`Determining birth sex for ${username}...`);
      const birthSex = await determineBirthSex(username, experienceReport);

      // Insert into database
      await db.insert(detransUsers).values({
        username,
        activeSince: earliest_comment_date,
        sex: birthSex,
        experienceSummary: experienceSummary || null,
        experience: experienceReport,
        redFlagsReport: redFlagsReport || null,
      });
    }

    // Generate tags (for both new users and existing users without tags)
    console.log(`Generating tags for ${username}...`);
    const tagNames = await generateTags(username, experienceReport, redFlagsReport);

    // Handle tags
    if (tagNames.length > 0) {
      console.log(`Assigning tags to ${username}:`, tagNames);
      const tagIds = await ensureTagsExist(tagNames);
      await assignTagsToUser(username, tagIds);
    }

    console.log(`Successfully processed user: ${username}`);

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`Error processing user ${username}:`, error);
  }
}

async function main() {
  try {
    console.log("Starting user experience generation...");

    const userComments = await getUserComments();
    console.log(`Found ${userComments.length} users to process`);

    // Process users in batches to avoid overwhelming the API
    const batchSize = 15;
    for (let i = 0; i < userComments.length; i += batchSize) {
      const batch = userComments.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userComments.length / batchSize)}`,
      );

      await Promise.all(batch.map(processUser));

      // Longer delay between batches
      if (i + batchSize < userComments.length) {
        console.log("Waiting before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    console.log("User experience generation completed!");
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
