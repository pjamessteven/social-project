import { withApiSecurity } from "@/app/lib/apiSecurity";
import { getCurrentSession } from "@/app/lib/auth/auth";
import { getIpFromRequest } from "@/app/lib/ipBan";
import {
  incrementMessageCount,
  isCaptchaRequired,
} from "@/app/lib/messageCounter";
import { db } from "@/db";
import { chatFeedback, chatConversations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const feedbackRequestSchema = z.object({
  messageId: z.string().min(1).max(36),
  vote: z.enum(["up", "down"]),
  feedbackText: z.string().max(2000).optional(),
});

/**
 * POST /api/chat/[uuid]/feedback
 *
 * Submit or update thumbs up/down feedback for an assistant message.
 *
 * Flow:
 * 1. Rate limit + IP ban check
 * 2. Validate request body
 * 3. Check for existing feedback (lock logic: downvotes with feedback are permanent)
 * 4. Captcha check for anonymous users (count-based, same as chat messages)
 * 5. Upsert feedback record
 * 6. Increment message count for captcha tracking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    // Centralized security: rate limit + IP ban + session + validation
    const { session, ip: ipAddress, validatedBody, error: securityError } = await withApiSecurity(request, {
      rateLimit: true,
      ipBan: true,
      getSession: true,
      validation: { schema: feedbackRequestSchema },
    });
    if (securityError) return securityError;

    const { uuid } = await params;
    if (!uuid) {
      return NextResponse.json(
        { error: "Conversation UUID is required" },
        { status: 400 },
      );
    }

    const { messageId, vote, feedbackText } = validatedBody as z.infer<typeof feedbackRequestSchema>;

    const username = session?.username || null;

    // Verify conversation exists
    const conversation = await db
      .select({ uuid: chatConversations.uuid })
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (!conversation[0]) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Check for existing feedback from this user on this message
    const existingCondition = username
      ? and(
          eq(chatFeedback.messageId, messageId),
          eq(chatFeedback.username, username),
        )
      : and(
          eq(chatFeedback.messageId, messageId),
          eq(chatFeedback.ipAddress, ipAddress),
        );

    const existingFeedback = await db
      .select()
      .from(chatFeedback)
      .where(existingCondition)
      .limit(1);

    const existing = existingFeedback[0];

    // Lock logic: if existing feedback has feedbackText (a completed downvote),
    // the vote is permanent and cannot be changed
    if (existing && existing.feedbackText) {
      return NextResponse.json(
        { error: "Feedback already submitted for this message" },
        { status: 403 },
      );
    }

    // Captcha check for anonymous users (same pattern as chat messages)
    if (!username) {
      const captchaRequired = await isCaptchaRequired(ipAddress);
      if (captchaRequired) {
        return NextResponse.json(
          { requiresCaptcha: true, error: "CAPTCHA verification required" },
          { status: 402 },
        );
      }
    }

    // Prepare feedback data
    const feedbackData = {
      conversationUuid: uuid,
      messageId,
      vote,
      feedbackText: vote === "down" ? feedbackText || null : null,
      ipAddress,
      username,
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing feedback (toggle or change vote)
      await db
        .update(chatFeedback)
        .set(feedbackData)
        .where(eq(chatFeedback.id, existing.id));
    } else {
      // Insert new feedback
      await db.insert(chatFeedback).values({
        ...feedbackData,
        createdAt: new Date(),
      });
      // Only increment message count for new submissions (not updates)
      await incrementMessageCount(ipAddress);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/chat/[uuid]/feedback?messageId=xxx
 *
 * Retrieve existing feedback for a specific message in a conversation.
 * Used to restore vote state when loading a conversation.
 *
 * Returns: { vote: 'up' | 'down' | null, isLocked: boolean }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!uuid || !messageId) {
      return NextResponse.json(
        { error: "Conversation UUID and messageId are required" },
        { status: 400 },
      );
    }

    // Get user info
    const session = await getCurrentSession();
    const username = session?.username || null;
    const ipAddress = getIpFromRequest(request);

    // Look up existing feedback
    const condition = username
      ? and(
          eq(chatFeedback.messageId, messageId),
          eq(chatFeedback.username, username),
        )
      : and(
          eq(chatFeedback.messageId, messageId),
          eq(chatFeedback.ipAddress, ipAddress),
        );

    const existingFeedback = await db
      .select()
      .from(chatFeedback)
      .where(condition)
      .limit(1);

    const existing = existingFeedback[0];

    if (!existing) {
      return NextResponse.json({ vote: null, isLocked: false });
    }

    return NextResponse.json({
      vote: existing.vote,
      isLocked: !!existing.feedbackText,
    });
  } catch (error) {
    console.error("Feedback retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve feedback" },
      { status: 500 },
    );
  }
}
