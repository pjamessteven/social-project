import { requireAuth } from "@/app/lib/auth/middleware";
import { checkIpBan } from "@/app/lib/ipBan";
import { bannedUsers, chatConversations, db } from "@/db";
import { OpenAI } from "@llamaindex/openai";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initSettings } from "../app/settings";
import { locales, getLanguageName } from "@/i18n/routing";

// Schema for the update request
const updateConversationSchema = z.object({
  featured: z.boolean().optional(),
  archived: z.boolean().optional(),
  // We could add other fields here in the future
});

// Use locales from i18n routing configuration
const LOCALES = locales;
type Locale = (typeof LOCALES)[number];

// Function to generate AI summary of a conversation
async function generateConversationTitleAndSummary(
  messages: string,
): Promise<{ title: string; summary: string; titleTranslations: Record<Locale, string>; summaryTranslations: Record<Locale, string> }> {
  try {
    // Parse the messages JSON
    const parsedMessages = JSON.parse(messages);

    // Extract conversation text for summarization
    const conversationText = parsedMessages
      .filter((msg: any) => msg.parts?.[0]?.type === "text")
      .map((msg: any) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        return `${role}: ${msg.parts[0].text}`;
      })
      .join("\n\n");

    if (!conversationText.trim()) {
      const noContentMsg = "No conversation content to summarize.";
      const noContentTitle = "Untitled Conversation";
      const noContentTitleTranslations = {} as Record<Locale, string>;
      const noContentSummaryTranslations = {} as Record<Locale, string>;
      LOCALES.forEach((locale) => {
        noContentTitleTranslations[locale] = noContentTitle;
        noContentSummaryTranslations[locale] = noContentMsg;
      });
      return {
        title: noContentTitle,
        summary: noContentMsg,
        titleTranslations: noContentTitleTranslations,
        summaryTranslations: noContentSummaryTranslations,
      };
    }

    // Initialize AI settings
    initSettings();

    // Create LLM instance (using same settings as main chat)
    const llm = new OpenAI({
      apiKey: process.env.OPENROUTER_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      model: "moonshotai/kimi-k2-0905:exacto",
    });

    // Create a prompt for generating both title and summary
    const titleAndSummaryPrompt = `

    ### Task
    1. Generate a concise, descriptive title for this archived conversation (max 10-12 words)
    2. Generate a 2-3 sentence summary of this archived conversation

    ### IMPORTANT GUIDELINES:
    **For both title and summary:**
    - Focus on the user and the key points detrans.ai helped with.
    - Always refer to detrans.ai as **detrans.ai**, not as 'the chatbot, 'the assistant', 'the bot', etc.
    - Do not use any variation of 'assigned sex at birth', AMAB, AFAB etc
    - Do not use the term 'gender dysphoria', use 'gender distress'
    - Do not refer to trans people, use "trans-identified people"
    - Try to capture the intention of detrans.ai

    ### Format your response as:
    TITLE: [Your generated title here]
    SUMMARY: [Your 2-3 sentence summary here]

    Conversation:
    ${conversationText}

    Response:`;

    // Generate title and summary using AI
    const response = await llm.complete({
      prompt: titleAndSummaryPrompt,
    });

    const responseText = response.text.trim();

    // Parse the response to extract title and summary
    let title = "Untitled Conversation";
    let summary = "Conversation summary";

    if (responseText) {
      const titleMatch = responseText.match(/TITLE:\s*(.+?)(?=\nSUMMARY:|$)/is);
      const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?=\n|$)/is);

      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
        // Ensure title is not too long (max 100 chars for safety)
        if (title.length > 100) {
          title = title.substring(0, 97) + "...";
        }
      }

      if (summaryMatch && summaryMatch[1]) {
        summary = summaryMatch[1].trim();
      } else if (responseText.includes("SUMMARY:")) {
        // Try to extract summary if format is slightly different
        const summaryParts = responseText.split("SUMMARY:");
        if (summaryParts.length > 1) {
          summary = summaryParts[1].trim();
        }
      }
    }

    // Fallback if AI returns empty or error
    if (!responseText || responseText.length < 10) {
      // Extract first user message as fallback
      const firstUserMessage = parsedMessages.find(
        (msg: any) => msg.role === "user" && msg.parts?.[0]?.type === "text",
      );

      if (firstUserMessage) {
        const text = firstUserMessage.parts[0].text;
        title = `Discussion: ${text.substring(0, 60)}${text.length > 60 ? "..." : ""}`;
        summary = `Discussion about: ${text.substring(0, 120)}${text.length > 120 ? "..." : ""}`;
      }
    }

    // Generate translations for all locales
    const defaultLocale = "en";
    const titleTranslations = {} as Record<Locale, string>;
    const summaryTranslations = {} as Record<Locale, string>;
    
    // Set the default locale title and summary
    titleTranslations[defaultLocale as Locale] = title;
    summaryTranslations[defaultLocale as Locale] = summary;

    // Generate translations for all non-default locales
    const localesToTranslate = LOCALES.filter((locale) => locale !== defaultLocale);
    
    for (const locale of localesToTranslate) {
      try {
        const languageName = getLanguageName(locale);
        
        // Translate title
        const titleTranslationPrompt = `
Translate the following conversation title to ${languageName}. 
Maintain the same meaning and tone. Only return the translated text, nothing else.

Title to translate:
${title}

Translation:`;

        const titleTranslationResponse = await llm.complete({
          prompt: titleTranslationPrompt,
        });

        const translatedTitle = titleTranslationResponse.text.trim();
        if (translatedTitle && translatedTitle.length > 3) {
          titleTranslations[locale] = translatedTitle;
        } else {
          // Fallback to English if translation fails
          titleTranslations[locale] = title;
        }

        // Translate summary
        const summaryTranslationPrompt = `
Translate the following conversation summary to ${languageName}. 
Maintain the same meaning and tone. Only return the translated text, nothing else.

Summary to translate:
${summary}

Translation:`;

        const summaryTranslationResponse = await llm.complete({
          prompt: summaryTranslationPrompt,
        });

        const translatedSummary = summaryTranslationResponse.text.trim();
        if (translatedSummary && translatedSummary.length > 5) {
          summaryTranslations[locale] = translatedSummary;
        } else {
          // Fallback to English if translation fails
          summaryTranslations[locale] = summary;
        }
      } catch (translationError) {
        console.error(`Error generating ${locale} translation:`, translationError);
        titleTranslations[locale] = title;
        summaryTranslations[locale] = summary;
      }
    }

    return { title, summary, titleTranslations, summaryTranslations };
  } catch (error) {
    console.error("Error generating conversation title and summary:", error);

    // Fallback to simple title and summary
    try {
      const parsedMessages = JSON.parse(messages);
      const firstUserMessage = parsedMessages.find(
        (msg: any) => msg.role === "user" && msg.parts?.[0]?.type === "text",
      );

      if (firstUserMessage) {
        const text = firstUserMessage.parts[0].text;
        const fallbackTitle = `Discussion: ${text.substring(0, 60)}${text.length > 60 ? "..." : ""}`;
        const fallbackSummary = `Discussion about: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`;
        const fallbackTitleTranslations = {} as Record<Locale, string>;
        const fallbackSummaryTranslations = {} as Record<Locale, string>;
        LOCALES.forEach((locale) => {
          fallbackTitleTranslations[locale] = fallbackTitle;
          fallbackSummaryTranslations[locale] = fallbackSummary;
        });
        return {
          title: fallbackTitle,
          summary: fallbackSummary,
          titleTranslations: fallbackTitleTranslations,
          summaryTranslations: fallbackSummaryTranslations,
        };
      }
    } catch (e) {
      // Ignore fallback errors
    }

    const fallbackTitle = "Untitled Conversation";
    const fallbackSummary = "AI-generated conversation summary";
    const fallbackTitleTranslations = {} as Record<Locale, string>;
    const fallbackSummaryTranslations = {} as Record<Locale, string>;
    LOCALES.forEach((locale) => {
      fallbackTitleTranslations[locale] = fallbackTitle;
      fallbackSummaryTranslations[locale] = fallbackSummary;
    });
    return {
      title: fallbackTitle,
      summary: fallbackSummary,
      titleTranslations: fallbackTitleTranslations,
      summaryTranslations: fallbackSummaryTranslations,
    };
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    // Check admin authentication
    const { session, errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });

    if (errorResponse) {
      return errorResponse;
    }

    const { uuid } = await params;

    // Validate UUID parameter
    if (!uuid || typeof uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid conversation UUID" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateConversationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    const { featured, archived } = validationResult.data;

    // Check if conversation exists
    const existingConversation = await db
      .select({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
        ipAddress: chatConversations.ipAddress,
      })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (!existingConversation[0]) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const conversation = existingConversation[0];
    const updateData: any = {};

    // Update featured flag if provided
    if (featured !== undefined) {
      updateData.featured = featured;

      // Generate AI summary when featuring a conversation
      // Always generate a new summary when featuring, even if one already exists
      // This ensures that if a conversation is unfeatured then re-featured, a fresh summary is generated
      if (featured === true) {
        try {
          const { title: generatedTitle, summary, titleTranslations, summaryTranslations } =
            await generateConversationTitleAndSummary(conversation.messages);
          updateData.title = generatedTitle;
          updateData.conversationSummary = summary;
          updateData.titleTranslation = JSON.stringify(titleTranslations);
          updateData.conversationSummaryTranslation = JSON.stringify(summaryTranslations);
        } catch (error) {
          console.error(
            "Failed to generate conversation title and summary:",
            error,
          );
          // Continue without title/summary if generation fails
        }
      }
    }

    // Update archived flag if provided
    if (archived !== undefined) {
      updateData.archived = archived;
    }

    // Do not update timestamp for featured/summary operations
    // Only update timestamp for other types of updates (if we add them in the future)

    // Update the conversation in the database
    const updatedConversation = await db
      .update(chatConversations)
      .set(updateData)
      .where(eq(chatConversations.uuid, uuid))
      .returning({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
      });

    return NextResponse.json({
      success: true,
      conversation: updatedConversation[0],
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 },
    );
  }
}

// Also support GET for retrieving a single conversation

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    // Check if IP is banned before processing request
    await checkIpBan(request);

    const { uuid } = await params;

    if (!uuid) {
      return NextResponse.json(
        { error: "UUID parameter is required" },
        { status: 400 },
      );
    }

    // Retrieve the conversation from the database
    const conversation = await db
      .select({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
      })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const chatData = conversation[0];

    // Parse the messages JSON
    let messages;
    try {
      messages = JSON.parse(chatData.messages);
    } catch (error) {
      console.error("Failed to parse messages JSON:", error);
      return NextResponse.json(
        { error: "Invalid conversation data" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      uuid: chatData.uuid,
      mode: chatData.mode,
      title: chatData.title,
      messages,
      featured: chatData.featured,
      archived: chatData.archived,
      conversationSummary: chatData.conversationSummary,
      createdAt: chatData.createdAt,
      updatedAt: chatData.updatedAt,
    });
  } catch (error) {
    console.error("Failed to retrieve conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST endpoint to manually generate summary for a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    // Check admin authentication
    const { session, errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });

    if (errorResponse) {
      return errorResponse;
    }

    const { uuid } = await params;

    // Validate UUID parameter
    if (!uuid || typeof uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid conversation UUID" },
        { status: 400 },
      );
    }

    // Check if conversation exists
    const existingConversation = await db
      .select({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
        ipAddress: chatConversations.ipAddress,
      })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (!existingConversation[0]) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const conversation = existingConversation[0];

    // Generate AI title and summary
    const { title: generatedTitle, summary, titleTranslations, summaryTranslations } =
      await generateConversationTitleAndSummary(conversation.messages);

    // Update the conversation with the new title and summary
    const updatedConversation = await db
      .update(chatConversations)
      .set({
        title: generatedTitle,
        conversationSummary: summary,
        titleTranslation: JSON.stringify(titleTranslations),
        conversationSummaryTranslation: JSON.stringify(summaryTranslations),
        updatedAt: new Date(),
      })
      .where(eq(chatConversations.uuid, uuid))
      .returning({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
      });

    return NextResponse.json({
      success: true,
      message: "Summary generated successfully",
      conversation: updatedConversation[0],
    });
  } catch (error) {
    console.error("Error generating conversation summary:", error);
    return NextResponse.json(
      { error: "Failed to generate conversation summary" },
      { status: 500 },
    );
  }
}

// DELETE endpoint to delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    // Check admin authentication
    const { session, errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });

    if (errorResponse) {
      return errorResponse;
    }

    const { uuid } = await params;

    // Validate UUID parameter
    if (!uuid || typeof uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid conversation UUID" },
        { status: 400 },
      );
    }

    // Check if conversation exists
    const existingConversation = await db
      .select({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
        ipAddress: chatConversations.ipAddress,
      })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (!existingConversation[0]) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Delete the conversation
    await db.delete(chatConversations).where(eq(chatConversations.uuid, uuid));

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}

// POST endpoint to ban a user by IP address
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    // Check admin authentication
    const { session, errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });

    if (errorResponse) {
      return errorResponse;
    }

    const { uuid } = await params;

    // Validate UUID parameter
    if (!uuid || typeof uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid conversation UUID" },
        { status: 400 },
      );
    }

    // Check if conversation exists
    const existingConversation = await db
      .select({
        uuid: chatConversations.uuid,
        mode: chatConversations.mode,
        title: chatConversations.title,
        messages: chatConversations.messages,
        featured: chatConversations.featured,
        archived: chatConversations.archived,
        conversationSummary: chatConversations.conversationSummary,
        conversationSummaryTranslation: chatConversations.conversationSummaryTranslation,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
        country: chatConversations.country,
        ipAddress: chatConversations.ipAddress,
      })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (!existingConversation[0]) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const conversation = existingConversation[0];

    // Check if IP address exists
    if (!conversation.ipAddress) {
      return NextResponse.json(
        { error: "No IP address associated with this conversation" },
        { status: 400 },
      );
    }

    // Parse request body for ban reason
    const body = await request.json();
    const reason = body.reason || "Banned by admin";

    // Check if IP is already banned
    const existingBan = await db
      .select()
      .from(bannedUsers)
      .where(eq(bannedUsers.ipAddress, conversation.ipAddress))
      .limit(1);

    if (existingBan[0]) {
      return NextResponse.json(
        { error: "IP address is already banned" },
        { status: 400 },
      );
    }

    // Add IP to banned users table
    const bannedUser = await db
      .insert(bannedUsers)
      .values({
        ipAddress: conversation.ipAddress,
        reason,
        bannedBy: session?.user?.username || "admin",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "User banned successfully",
      bannedUser: bannedUser[0],
    });
  } catch (error) {
    console.error("Error banning user:", error);
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 });
  }
}
