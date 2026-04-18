import { getCurrentSession } from "@/app/lib/auth/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get current session from cookies
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.userId,
        username: session.username,
        email: session.username, // Email is stored in username field
        role: session.role,
      },
    });
  } catch (error) {
    console.error("Current user endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
