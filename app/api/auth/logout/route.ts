import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/app/lib/auth/auth";

export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
