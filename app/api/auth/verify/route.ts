import { setSessionCookie, verifyMagicLink } from "@/app/lib/auth/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      // Redirect to login page with error
      return NextResponse.redirect(
        new URL("/login?error=missing_token", request.url),
      );
    }

    // Verify magic link
    const result = await verifyMagicLink(token);

    if (!result.success || !result.user) {
      // Redirect to login page with error
      return NextResponse.redirect(
        new URL("/login?error=invalid_or_expired", request.url),
      );
    }

    // Set session cookie
    await setSessionCookie(result.user);

    // Redirect to conversations page or redirect URL if provided
    const redirectTo = searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error("Magic link verification endpoint error:", error);
    // Redirect to login page with error
    return NextResponse.redirect(
      new URL("/login?error=server_error", request.url),
    );
  }
}
