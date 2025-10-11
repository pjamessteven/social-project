import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { OpenAI } from "openai";

import postgres from "postgres";
import { detransUsers } from "../db/schema";

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

const MODEL = "moonshotai/kimi-k2";

// Rough estimate: 1 token ≈ 4 characters for English text
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 3;
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
    LIMIT 5
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

  const prompt = `You are analyzing comments from a user named "${username}" from a detransition support community. Based on their comments, write a detailed experience report that captures their detransition journey.

Comments: ${truncatedComments}
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
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

  const prompt = `You are analyzing comments from a user named "${username}" from a detransition support community. Based on their comments, is this person an authentic detransitioner? Are there any red flags that suggest that this person is a bot, not a real person, or not a de-transitioner? 

  If you think it is a bot, or not an authentic detransitioner, explain the red flags, and give examples.
  Explain your answer clearly.

Comments: ${truncatedComments}
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
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
  const prompt = `Summarize the following detransition experience report in exactly 5 sentences or fewer. Focus on who this person is (male/female detransitioner, or other), the most important aspects of their journey, and where they are at now.:

${experienceReport}

Summary (5 sentences max):`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
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
      max_tokens: 10,
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
  const predefinedTags = [
    "trauma",
    "autism",
    "ocd",
    "puberty discomfort",
    "top surgery",
    "bottom surgery",
    "internalised homophobia",
    "autogynephilia (AGP)",
    "started as non-binary",
    "escapism",
    "depression",
    "low self-esteem",
    "anxiety",
    "eating disorder",
    "influenced online",
    "influenced by friends",
    "trans kid",
    "hormone therapy",
    "puberty blockers",
    "health complications",
    "infertility",
    "body dysmorphia",
    "retransition",
    "social transition only",
    "suspicious account"
  ];

  const prompt = `Based on the following comments from a detransition community user, identify which of these predetermined tags apply to their experience. Only select tags that are clearly supported by the content.
Only use the 'suspicious account' tag if the redFlagsReport suspects that this account might not be authentic. 

Available tags: ${predefinedTags.join(", ")}

Comments from user "${username}": ${comments.substring(0, 3000)}...
Red flag report of comments : ${redFlagsReport}...

Return only a JSON array of applicable tags. Example: ["trauma", "top surgery", "autism"]`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const result = response.choices[0]?.message?.content;
    if (!result) return [];

    // Parse the JSON response
    const parsed = JSON.parse(result);

    // Handle different possible response formats
    let tags: string[] = [];
    if (Array.isArray(parsed)) {
      tags = parsed;
    } else if (parsed.tags && Array.isArray(parsed.tags)) {
      tags = parsed.tags;
    } else if (typeof parsed === "object") {
      // Try to find an array property
      const arrayProp = Object.values(parsed).find((val) => Array.isArray(val));
      if (arrayProp) tags = arrayProp as string[];
    }

    // Filter to only include predefined tags
    return tags.filter((tag) => predefinedTags.includes(tag.toLowerCase()));
  } catch (error) {
    console.error(`Error generating tags for ${username}:`, error);
    return [];
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
  if (existingUser.length > 0) {
    console.log(`User ${username} already exists, skipping...`);
    return;
  }

  try {
    // Generate experience report
    console.log(`Generating experience report for ${username}...`);
    const experienceReport = await generateExperienceReport(
      username,
      all_comments,
    );

    if (!experienceReport) {
      console.log(
        `Failed to generate experience report for ${username}, skipping...`,
      );
      return;
    }

    const redFlagsReport = await generateRedFlagsReport(username, all_comments);


    // Generate summary
    console.log(`Generating experience summary for ${username}...`);
    const experienceSummary = await generateExperienceSummary(experienceReport);

    // Determine birth sex
    console.log(`Determining birth sex for ${username}...`);
    const birthSex = await determineBirthSex(username, experienceReport);

    // Generate tags
    console.log(`Generating tags for ${username}...`);
    const tags = await generateTags(username, experienceReport, redFlagsReport);

    // Insert into database
    await db.insert(detransUsers).values({
      username,
      activeSince: earliest_comment_date,
      sex: birthSex,
      experienceSummary: experienceSummary || null,
      experience: experienceReport,
      redFlagsReport: redFlagsReport || null,
      tags: tags.length > 0 ? JSON.stringify(tags) : null,
    });

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
    const batchSize = 5;
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
