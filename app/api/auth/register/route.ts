import { addUserToWhitelist } from "@/app/lib/auth/auth";
import { requireAuth } from "@/app/lib/auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for adding user to whitelist (admin only)
const whitelistSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().optional().default("user"),
});

// Registration is now done via whitelist only
// This endpoint allows admins to add users to the whitelist
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { session, errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });

    if (errorResponse) {
      return errorResponse;
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = whitelistSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    const { email, role } = validationResult.data;

    // Add user to whitelist
    const result = await addUserToWhitelist(email, role);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to add user",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} has been added to the whitelist`,
    });
  } catch (error) {
    console.error("Whitelist endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Get all whitelisted users (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const { errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });

    if (errorResponse) {
      return errorResponse;
    }

    const { getWhitelistedUsers } = await import("@/app/lib/auth/auth");
    const users = await getWhitelistedUsers();

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get whitelisted users error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
