import { verifyCaptchaToken } from "@/app/lib/captcha";
import { withApiSecurity } from "@/app/lib/apiSecurity";
import {
  grantConversationsPass,
  initializeConversationCount,
  initializeMessageCount,
} from "@/app/lib/messageCounter";
import { connectRedis } from "@/app/lib/redis";
import { getIP } from "@/app/lib/getIp";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const captchaVerifySchema = z.object({
  token: z.string().min(1).max(10000),
  conversationId: z.string().uuid().optional(),
  purpose: z.enum(["allConversations"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit + IP ban + input validation
    const { ip, validatedBody, error: securityError } = await withApiSecurity(req, {
      rateLimit: { perMinute: 15, perHour: 360 },
      ipBan: true,
      validation: { schema: captchaVerifySchema },
    });
    if (securityError) return securityError;

    const { token, conversationId, purpose } = validatedBody as z.infer<
      typeof captchaVerifySchema
    >;

    const isValid = await verifyCaptchaToken(token);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "CAPTCHA verification failed" },
        { status: 400 },
      );
    }

    if (purpose === "allConversations") {
      // Grant a one-time pass for the next "All conversations" page fetch
      await grantConversationsPass(ip);
    } else if (conversationId) {
      // Reset the message count for this chat so verified user can continue
      await initializeConversationCount(conversationId);
      // Mark this IP as verified in Redis (expires after 1 hour)
      const redis = await connectRedis();

      if (redis) {
        const key = `captcha:verified:${ip}`;
        await redis.setEx(key, 3600, "1"); // 1 hour TTL
      }
    } else {
      // Mark this IP as verified in Redis (expires after 1 hour)
      const redis = await connectRedis();

      if (redis) {
        const key = `captcha:verified:${ip}`;
        await redis.setEx(key, 3600, "1"); // 1 hour TTL
      }

      // Initialize message count for this IP after CAPTCHA verification (sets to 0)
      await initializeMessageCount(ip);
    }

    return NextResponse.json({
      success: true,
      message: "CAPTCHA verified successfully",
    });
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
