import { NextRequest, NextResponse } from "next/server";
import { loginUser, setSessionCookie } from "@/app/lib/auth/auth";
import { z } from "zod";

// Schema for login request
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { username, password } = validationResult.data;

    // Attempt to login user
    const result = await loginUser({ username, password });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Login failed",
        },
        { status: 401 }
      );
    }

    // Set session cookie
    await setSessionCookie(result.user!);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user!.userId,
        username: result.user!.username,
        email: result.user!.email,
        role: result.user!.role,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
