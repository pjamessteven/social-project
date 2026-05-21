import { isAdmin } from "@/app/lib/auth/auth";
import { extractPdfText } from "@/app/lib/pdf";
import { db } from "@/db";
import { studyTags } from "@/db/schema";
import { OpenAI } from "@llamaindex/openai";
import { NextRequest, NextResponse } from "next/server";

const MAX_TEXT_LENGTH = 150_000;

function buildCorePrompt(existingTags: string[]): string {
  const tagInstructions =
    existingTags.length > 0
      ? `Tags:
- Generate 3-7 topic tags that describe what the study covers.
- Prioritize reusing existing tags from this list when appropriate: ${existingTags.join(", ")}.
- You may create new tags if none of the existing ones fit well.`
      : `Tags:
- Generate 3-7 topic tags that describe what the study covers (e.g., "puberty blockers", "cross-sex hormones", "mental health", "detransition", "social transition", "suicidality", "bone density", "fertility", "methodology").`;

  return `You are an academic research assistant. Analyze the following paper text and extract the core bibliographic metadata.

Important instructions:
- If a field cannot be determined from the text, return null (not an empty string).
- Year must be a number (the publication year), or null if unknown.
- Authors should be a comma-separated string of names, or null if unknown.
- Journal should be the name of the publication journal, or null if unknown.
- Title should be the full study title, or null if unknown.

${tagInstructions}

Return ONLY a valid JSON object with these exact keys and no other text:
{
  "title": string | null,
  "authors": string | null,
  "year": number | null,
  "journal": string | null,
  "tags": string[]
}

Paper text:
---
`;
}

const ABSTRACT_PROMPT = `You are an academic research assistant. Read the following paper text and extract the abstract.

Instructions:
- If an abstract is explicitly present, return it verbatim.
- If no abstract is present, write a concise summary of the paper's purpose and methods.
- Return ONLY a valid JSON object: { "abstract": string | null }

Paper text:
---
`;

const CONCLUSION_PROMPT = `You are an academic research assistant. Read the following paper text and extract the conclusion.

Instructions:
- If a conclusion section is explicitly present, return it.
- If not, summarize the main findings and takeaways.
- Return ONLY a valid JSON object: { "conclusion": string | null }

Paper text:
---
`;

const SUMMARY_PROMPT = `You are an academic research assistant. Read the following paper text and write a brief 2-3 sentence overview of the entire paper.

Instructions:
- This should be a high-level summary suitable for a general audience.
- Return ONLY a valid JSON object: { "summary": string | null }

Paper text:
---
`;

const KEY_POINTS_PROMPT = `You are an academic research assistant. Read the following paper text and identify the 5 most important takeaways.

Instructions:
- Each point should be short and easily digestible for a general audience.
- Return exactly 5 items.
- Return ONLY a valid JSON object: { "keyPoints": string[] }

Paper text:
---
`;

const LIMITATIONS_PROMPT = `You are an academic research assistant. Read the following paper text and identify any significant methodological limitations, flaws, fallacies, contradictions or conflicts of interest.

Instructions:
- Be specific and cite details from the text where possible.
- Return each limitation as a separate string in the array.
- If no significant limitations are mentioned, return an empty array.
- Return ONLY a valid JSON object: { "limitations": string[] }

Paper text:
---
`;

interface CoreMetadata {
  title: string | null;
  authors: string | null;
  year: number | null;
  journal: string | null;
  tags: string[];
}

interface FieldResult<T> {
  value: T | null;
  error: string | null;
}

function createLlm() {
  return new OpenAI({
    temperature: 0.6,
    apiKey: process.env.KIMI_KEY,
    baseURL: "https://api.moonshot.ai/v1",
    model: "kimi-k2.6",
    topP: 0.95,
    additionalSessionOptions: {
      thinking: { type: "disabled" },
    } as any,
    additionalChatOptions: {
      thinking: { type: "disabled" },
    } as any,
  });
}

async function extractJson<T>(
  llm: OpenAI,
  prompt: string,
  fieldName: string,
): Promise<FieldResult<T>> {
  console.log(`[Extract API] Starting LLM call for: ${fieldName}`);
  console.log(`[Extract API] ${fieldName} prompt length:`, prompt.length);

  try {
    const response = await llm.complete({ prompt });
    console.log(`[Extract API] ${fieldName} LLM response received`);

    const responseText = response.text.trim();
    console.log(
      `[Extract API] ${fieldName} response text length:`,
      responseText.length,
    );

    // Parse JSON - handle markdown code blocks
    let jsonStr = responseText;
    const codeBlockMatch = responseText.match(
      /```(?:json)?\s*([\s\S]*?)\s*```/,
    );
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
      console.log(`[Extract API] ${fieldName} extracted JSON from code block`);
    }

    const parsed = JSON.parse(jsonStr);
    console.log(`[Extract API] ${fieldName} JSON parsed successfully`);

    return { value: parsed, error: null };
  } catch (err) {
    console.error(`[Extract API] ${fieldName} extraction failed:`, err);
    return { value: null, error: `${fieldName} extraction failed` };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  console.log("[Extract API] Route handler started");
  try {
    const admin = await isAdmin();
    console.log("[Extract API] Auth check complete, isAdmin:", admin);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    console.log("[Extract API] FormData parsed");

    const pdfFile = formData.get("pdf") as File | null;
    let fullText = (formData.get("fullText") as string) || "";
    console.log(
      "[Extract API] PDF file present:",
      !!pdfFile,
      "PDF size:",
      pdfFile?.size || 0,
    );
    console.log("[Extract API] Initial fullText length:", fullText.length);

    if (pdfFile && pdfFile.size > 0) {
      console.log("[Extract API] Starting PDF text extraction...");
      try {
        const extractedText = await extractPdfText(pdfFile);
        console.log(
          "[Extract API] PDF extraction complete, extracted length:",
          extractedText.length,
        );
        if (extractedText.trim()) {
          fullText = fullText.trim() || extractedText;
          console.log(
            "[Extract API] Using extracted text, fullText length:",
            fullText.length,
          );
        } else {
          console.log("[Extract API] Extracted text was empty");
        }
      } catch (pdfError) {
        console.error("[Extract API] Failed to parse PDF:", pdfError);
        return NextResponse.json(
          { error: "Failed to parse PDF. Please paste the text manually." },
          { status: 400 },
        );
      }
    }

    if (!fullText.trim()) {
      console.log("[Extract API] No text available after extraction");
      return NextResponse.json(
        { error: "Full text or PDF is required" },
        { status: 400 },
      );
    }
    console.log(
      "[Extract API] Proceeding with fullText length:",
      fullText.length,
    );

    // Truncate if too long
    const truncatedText =
      fullText.length > MAX_TEXT_LENGTH
        ? fullText.slice(0, MAX_TEXT_LENGTH) +
          "\n\n[Text truncated due to length...]"
        : fullText;
    console.log("[Extract API] Truncated text length:", truncatedText.length);

    // Fetch existing tags to guide the LLM
    console.log("[Extract API] Fetching existing tags from database...");
    const existingTagRecords = await db.select().from(studyTags);
    const existingTagNames = existingTagRecords.map((t) => t.name);
    console.log(
      "[Extract API] Existing tags count:",
      existingTagNames.length,
    );

    const llm = createLlm();

    // Call 1: Core metadata
    const coreResult = await extractJson<CoreMetadata>(
      llm,
      `${buildCorePrompt(existingTagNames)}${truncatedText}\n---`,
      "core metadata",
    );

    // Call 2: Abstract
    const abstractResult = await extractJson<{ abstract: string | null }>(
      llm,
      `${ABSTRACT_PROMPT}${truncatedText}\n---`,
      "abstract",
    );

    // Call 3: Conclusion
    const conclusionResult = await extractJson<{ conclusion: string | null }>(
      llm,
      `${CONCLUSION_PROMPT}${truncatedText}\n---`,
      "conclusion",
    );

    // Call 4: Summary
    const summaryResult = await extractJson<{ summary: string | null }>(
      llm,
      `${SUMMARY_PROMPT}${truncatedText}\n---`,
      "summary",
    );

    // Call 5: Key points
    const keyPointsResult = await extractJson<{ keyPoints: string[] }>(
      llm,
      `${KEY_POINTS_PROMPT}${truncatedText}\n---`,
      "key points",
    );

    // Call 6: Limitations
    const limitationsResult = await extractJson<{ limitations: string[] }>(
      llm,
      `${LIMITATIONS_PROMPT}${truncatedText}\n---`,
      "limitations",
    );

    // Collect errors
    const errors: string[] = [];
    if (coreResult.error) errors.push(coreResult.error);
    if (abstractResult.error) errors.push(abstractResult.error);
    if (conclusionResult.error) errors.push(conclusionResult.error);
    if (summaryResult.error) errors.push(summaryResult.error);
    if (keyPointsResult.error) errors.push(keyPointsResult.error);
    if (limitationsResult.error) errors.push(limitationsResult.error);

    const core = coreResult.value;

    console.log("[Extract API] All LLM calls complete. Errors:", errors.length);
    console.log("[Extract API] Returning success response");

    return NextResponse.json({
      success: true,
      fullText,
      title: core?.title ?? null,
      authors: core?.authors ?? null,
      year: core?.year ?? null,
      journal: core?.journal ?? null,
      abstract: abstractResult.value?.abstract ?? null,
      conclusion: conclusionResult.value?.conclusion ?? null,
      summary: summaryResult.value?.summary ?? null,
      keyPoints: keyPointsResult.value?.keyPoints ?? [],
      tags: core?.tags ?? [],
      limitations: limitationsResult.value?.limitations ?? [],
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Extract API] Error extracting study metadata:", error);
    return NextResponse.json(
      { error: "Failed to extract study metadata" },
      { status: 500 },
    );
  }
}
