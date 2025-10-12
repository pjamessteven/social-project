import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { OpenAI } from "openai";

import postgres from "postgres";
import { detransUsers, detransTags, detransUserTags } from "../db/schema";

export const availableTags = [
  "trauma",
  "autistic",
  "ocd",
  "puberty discomfort",
  "got top surgery",
  "got bottom surgery",
  "internalised homophobia",
  "autogynephilia (AGP)",
  "started as non-binary",
  "escapism",
  "depression",
  "low self-esteem",
  "anxiety",
  "porn problem",
  "hated breasts",
  "benefited from non-affirming therapy",
  "eating disorder",
  "influenced online",
  "influenced by friends",
  "regrets transitioning",
  "doesn't regret transitioning",
  "trans kid",
  "took hormones",
  "took puberty blockers",
  "serious health complications",
  "now infertile",
  "body dysmorphia",
  "retransition",
  "benefited from psychedelic drugs",
  "had religious background",
  "became religious",
  "become non-religious",
  "only transitioned socially",
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

// Rough estimate: 1 token ≈ 4 characters for English text
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 2;
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
      MIN(created) as earliest_comment_date,
      MAX(score) as top_score
    FROM detrans_comments 
    WHERE username IS NOT NULL 
      AND username != '[deleted]'
    GROUP BY username 
    HAVING COUNT(*) >= 5
    ORDER BY MAX(score) DESC, comment_count DESC
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
  If any of the topics delcare in Topics of Significance relate to your experience, make sure to write about them. 
  Explain your thoughts on gender and state if you have any regrets about your transition.
  Use a table to show your timeline of transition/detransition events at the end of your response. Try and put your exact age for each event if it's available.

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

  Topics of significance: ${availableTags}

  Your previous Comments: ${truncatedComments}

`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      })
    );

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
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      })
    );

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

  Experience Report:
  ${experienceReport}

  Summary (5 sentences max):`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      })
    );

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating experience summary:", error);
    return "";
  }
}

async function determineBirthSex(
  username: string,
  experienceReport: string,
): Promise<"m" | "f"> {
  const prompt = `Based on the following experience report from a detransitioner, determine their birth sex (biological sex assigned at birth). Look for explicit mentions of their birth sex, transition direction (FTM/MTF), or other clear indicators.

Experience report from user "${username}": 
${experienceReport}

Respond with only "m" for male or "f" for female birth sex. If unclear, make your best inference based on transition patterns mentioned.`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      })
    );

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    return result === "m" || result === "male" ? "m" : "f";
  } catch (error) {
    console.error(`Error determining birth sex for ${username}:`, error);
    return "f"; // Default fallback
  }
}

async function extractAges(
  username: string,
  experienceReport: string,
): Promise<{ 
  transitionAge: number | null; 
  detransitionAge: number | null;

  hormonesAge: number | null;
  topSurgeryAge: number | null;
  bottomSurgeryAge: number | null;
  pubertyBlockersAge: number | null;
}> {
  const prompt = `Based on the following timeline from a detransition community user, extract their ages for various transition-related events and the years when these events occurred.

Definitions:
transitionAge: generally when someone starts socially identifying as trans, non-binary, or the opposite sex, or says to themself "i'm trans"
detransitionAge: when someone stops identifying as trans or stops taking hormones/HRT
pubertyBlockersAge: when someone starts puberty blockers
hormonesAge: when someone starts HRT - oestrogen (also spelt estrogen) or testosterone
topSurgeryAge: when a someone gets a masectomy
bottomSurgeryAge: when someone gets bottom surgery - a phalloplasty or vaginoplasty. 

Detransition timeline (look for the table): 
${experienceReport}

Return a JSON object with "transitionAge", "detransitionAge", "hormonesAge", "topSurgeryAge", "bottomSurgeryAge", and "pubertyBlockersAge" as numbers, or null if not mentioned or unclear.
Example: {"transitionAge": 16, "detransitionAge": 23, "hormonesAge": 17, "topSurgeryAge": 19, "bottomSurgeryAge": null, "pubertyBlockersAge": 13}
If ages or years are not clearly stated, return null for those fields.`;

  try {
    const response = await fetchWithBackoff(() =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      })
    );

    const result = response.choices[0]?.message?.content;
    if (!result) return { 
      transitionAge: null, 
      detransitionAge: null, 
      hormonesAge: null,
      topSurgeryAge: null,
      bottomSurgeryAge: null,
      pubertyBlockersAge: null
    };

    const parsed = JSON.parse(result);
    return {
      transitionAge: typeof parsed.transitionAge === 'number' ? parsed.transitionAge : null,
      detransitionAge: typeof parsed.detransitionAge === 'number' ? parsed.detransitionAge : null,
      transitionYear: null,
      detransitionYear: null,
      hormonesAge: typeof parsed.hormonesAge === 'number' ? parsed.hormonesAge : null,
      topSurgeryAge: typeof parsed.topSurgeryAge === 'number' ? parsed.topSurgeryAge : null,
      bottomSurgeryAge: typeof parsed.bottomSurgeryAge === 'number' ? parsed.bottomSurgeryAge : null,
      pubertyBlockersAge: typeof parsed.pubertyBlockersAge === 'number' ? parsed.pubertyBlockersAge : null,
    };
  } catch (error) {
    console.error(`Error extracting ages for ${username}:`, error);
    return { 
      transitionAge: null, 
      detransitionAge: null, 
      transitionYear: null, 
      detransitionYear: null,
      hormonesAge: null,
      topSurgeryAge: null,
      bottomSurgeryAge: null,
      pubertyBlockersAge: null
    };
  }
}

async function calculateTransitionYears(
  username: string,
  comments: string,
  extractedAges: {
    transitionAge: number | null;
    detransitionAge: number | null;
  }
): Promise<{
  transitionYear: number | null;
  detransitionYear: number | null;
}> {

  const prompt = `Based on the following user comments and extracted age data, calculate the missing transition and/or detransition years.

Use the following information to calculate the transition/detransition years:
- Transition age: ${extractedAges.transitionAge || 'unknown'}
- Detransition age: ${extractedAges.detransitionAge || 'unknown'}

Look for clues in the experience report such as:
- Current age mentions ("I'm now 25")
- Time references ("2 years ago", "last year", "5 years later")
- Specific years mentioned in context
- Duration of transition ("I was on hormones for 3 years")

Calculate the missing years based on:
1. If you know current age and transition/detransition age, work backwards from the date in the comments.
2. If you know one year and the age difference, calculate the other
3. If you know duration between events, use that to calculate

user comments: ${comments}...

Return a JSON object with "transitionYear" and "detransitionYear" as numbers, or null if cannot be calculated.
Example: {"transitionYear": 2018, "detransitionYear": 2022}`;

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
    if (!result) return { transitionYear: extractedAges.transitionYear, detransitionYear: extractedAges.detransitionYear };

    const parsed = JSON.parse(result);
    return {
      transitionYear: typeof parsed.transitionYear === 'number' ? parsed.transitionYear : extractedAges.transitionYear,
      detransitionYear: typeof parsed.detransitionYear === 'number' ? parsed.detransitionYear : extractedAges.detransitionYear,
    };
  } catch (error) {
    console.error(`Error calculating transition years for ${username}:`, error);
    return { transitionYear: extractedAges.transitionYear, detransitionYear: extractedAges.detransitionYear };
  }
}

async function fillMissingAges(
  username: string,
  existingUser: any,
): Promise<{ 
  transitionAge: number | null; 
  detransitionAge: number | null;
  transitionYear: number | null;
  detransitionYear: number | null;
  hormonesAge: number | null;
  topSurgeryAge: number | null;
  bottomSurgeryAge: number | null;
  pubertyBlockersAge: number | null;
}> {
  // Check if any age fields are missing
  const hasAllAges = existingUser.transitionAge !== null && 
                     existingUser.detransitionAge !== null && 
                     existingUser.transitionYear !== null && 
                     existingUser.detransitionYear !== null &&
                     existingUser.hormonesAge !== null &&
                     existingUser.topSurgeryAge !== null &&
                     existingUser.bottomSurgeryAge !== null &&
                     existingUser.pubertyBlockersAge !== null;

  if (hasAllAges) {
    return {
      transitionAge: existingUser.transitionAge,
      detransitionAge: existingUser.detransitionAge,
      transitionYear: existingUser.transitionYear,
      detransitionYear: existingUser.detransitionYear,
      hormonesAge: existingUser.hormonesAge,
      topSurgeryAge: existingUser.topSurgeryAge,
      bottomSurgeryAge: existingUser.bottomSurgeryAge,
      pubertyBlockersAge: existingUser.pubertyBlockersAge,
    };
  }

  console.log(`Attempting to fill missing age data for ${username} from experience text...`);

  // Use experience text to extract missing ages
  const experienceText = existingUser.experience || existingUser.experienceSummary || "";
  if (!experienceText) {
    console.log(`No experience text available for ${username}, cannot fill missing ages`);
    return {
      transitionAge: existingUser.transitionAge,
      detransitionAge: existingUser.detransitionAge,
      transitionYear: existingUser.transitionYear,
      detransitionYear: existingUser.detransitionYear,
      hormonesAge: existingUser.hormonesAge,
      topSurgeryAge: existingUser.topSurgeryAge,
      bottomSurgeryAge: existingUser.bottomSurgeryAge,
      pubertyBlockersAge: existingUser.pubertyBlockersAge,
    };
  }

  const extractedAges = await extractAges(username, experienceText);

  // Merge existing data with extracted data, preferring existing data when available
  return {
    transitionAge: existingUser.transitionAge ?? extractedAges.transitionAge,
    detransitionAge: existingUser.detransitionAge ?? extractedAges.detransitionAge,
    transitionYear: existingUser.transitionYear ?? extractedAges.transitionYear,
    detransitionYear: existingUser.detransitionYear ?? extractedAges.detransitionYear,
    hormonesAge: existingUser.hormonesAge ?? extractedAges.hormonesAge,
    topSurgeryAge: existingUser.topSurgeryAge ?? extractedAges.topSurgeryAge,
    bottomSurgeryAge: existingUser.bottomSurgeryAge ?? extractedAges.bottomSurgeryAge,
    pubertyBlockersAge: existingUser.pubertyBlockersAge ?? extractedAges.pubertyBlockersAge,
  };
}

async function generateTags(
  username: string,
  experienceReport: string,
  redFlagsReport: string,
): Promise<string[]> {
  const prompt = `Based on the following experience report from an detransition community user, identify relevant tags that apply to their experience. 
  You may only select tags that are listed in the Available tag options. 
Only select tags that are clearly supported by the content and are directly relevant to the user.
For example, only include 'infertility' if the user is actually now infertile, or 'bottom surgery' if the user had bottom surgery.
Don't include "only transitioned socially" if the user actually took hormones or had surgery. 
Only use the 'suspicious account' tag if the Red Flag Report suspects that this account might not be authentic. 

Available Tag Options: 
${availableTags}

Experience Report from user "${username}": 
${experienceReport}

Red Flag Report: 
${redFlagsReport}

Return only a JSON array of applicable tags. Example: ["trauma", "top surgery", "autism"]`;

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

    // Return all generated tags (no filtering against predefined list)
    return tagNames.map(tag => tag.toLowerCase());
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

async function processUser(userComments: UserComments, index: number, total: number): Promise<void> {
  const { username, all_comments, earliest_comment_date } = userComments;

  console.log(
    `[${index + 1}/${total}] Processing user: ${username} (${userComments.comment_count} comments)`,
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

  const userExists = existingUser.length > 0;

  if (existingUser.length > 0 && existingTags.length > 0) {
    // Check if user has missing age data
             /*
    const user = existingUser[0];

    const hasMissingAges = user.transitionAge === null || 
                          user.detransitionAge === null || 
                          user.transitionYear === null || 
                          user.detransitionYear === null;
 

    if (hasMissingAges) {
      console.log(`User ${username} has missing age data, attempting to fill from experience...`);
      const updatedAges = await fillMissingAges(username, user);
      
      // Update the user with the filled age data
      await db.update(detransUsers)
        .set({
          transitionAge: updatedAges.transitionAge,
          detransitionAge: updatedAges.detransitionAge,
          transitionYear: updatedAges.transitionYear,
          detransitionYear: updatedAges.detransitionYear,
        })
        .where(eq(detransUsers.username, username));
      
      console.log(`Updated age data for ${username}`);
    } else {
      console.log(`User ${username} already exists with complete data, skipping...`);
    }
          */

    return;
  }

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

      // Extract ages and years
      console.log(`Extracting transition/detransition ages and years for ${username}...`);
      const { transitionAge, detransitionAge, hormonesAge, topSurgeryAge, bottomSurgeryAge, pubertyBlockersAge } = await extractAges(username, experienceReport);

      // Calculate missing transition/detransition years if needed
      console.log(`Calculating missing transition/detransition years for ${username}...`);
      const calculatedYears = await calculateTransitionYears(username, all_comments, {
        transitionAge,
        detransitionAge,
      });

      // Insert into database
      await db.insert(detransUsers).values({
        username,
        activeSince: earliest_comment_date,
        sex: birthSex,
        experienceSummary: experienceSummary || null,
        experience: experienceReport,
        redFlagsReport: redFlagsReport || null,
        transitionAge,
        detransitionAge,
        transitionYear: calculatedYears.transitionYear,
        detransitionYear: calculatedYears.detransitionYear,
        hormonesAge,
        topSurgeryAge,
        bottomSurgeryAge,
        pubertyBlockersAge,
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

    const startTime = Date.now();
    let processedCount = 0;

    // Process users in batches to avoid overwhelming the API
    const batchSize = 15;
    for (let i = 0; i < userComments.length; i += batchSize) {
      const batch = userComments.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(userComments.length / batchSize);
      
      console.log(
        `Processing batch ${batchNumber}/${totalBatches} (Users ${i + 1}-${Math.min(i + batchSize, userComments.length)} of ${userComments.length})`,
      );

      await Promise.all(batch.map((user, batchIndex) => processUser(user, i + batchIndex, userComments.length)));

      processedCount += batch.length;
      
      // Calculate and display progress
      const elapsedTime = Date.now() - startTime;
      const avgTimePerUser = elapsedTime / processedCount;
      const remainingUsers = userComments.length - processedCount;
      const estimatedTimeRemaining = avgTimePerUser * remainingUsers;
      
      const progressPercent = ((processedCount / userComments.length) * 100).toFixed(1);
      const etaMinutes = Math.round(estimatedTimeRemaining / 60000);
      
      console.log(`Progress: ${processedCount}/${userComments.length} users (${progressPercent}%) - ETA: ${etaMinutes} minutes`);

      // Longer delay between batches
      if (i + batchSize < userComments.length) {
        console.log("Waiting before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 60000);
    console.log(`User experience generation completed! Total time: ${totalTime} minutes`);
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
