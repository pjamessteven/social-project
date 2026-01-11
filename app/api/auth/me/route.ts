import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/app/lib/auth/auth";

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
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.userId,
        username: session.username,
        email: session.email,
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
      { status: 500 }
    );
  }
}
