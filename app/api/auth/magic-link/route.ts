import { requestMagicLink } from "@/app/lib/auth/auth";
import { sendMagicLinkEmail } from "@/app/lib/auth/email";
import { checkIpBan } from "@/app/lib/ipBan";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for magic link request
const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  try {
    // Check if IP is banned before processing request
    await checkIpBan(request);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = magicLinkSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    const { email } = validationResult.data;

    // Request magic link (creates token in database)
    const result = await requestMagicLink(email);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to request magic link",
        },
        { status: 500 },
      );
    }

    // If we have a magic token, send the email
    if (result.magicToken && result.userId) {
      const emailResult = await sendMagicLinkEmail({
        email,
        magicToken: result.magicToken,
        userId: result.userId,
      });

      if (!emailResult.success) {
        console.error("Failed to send magic link email:", emailResult.error);
        // Still return success to prevent email enumeration
        // The token is created but email failed - admin will need to check logs
      }
    }

    // Always return the same message whether user exists or not
    // This prevents email enumeration attacks
    return NextResponse.json({
      success: true,
      message: "If you have an account, you will receive a magic link shortly.",
    });
  } catch (error) {
    console.error("Magic link request endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
