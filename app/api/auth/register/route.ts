import { registerUser, setSessionCookie } from "@/app/lib/auth/auth";
import { checkIpBan } from "@/app/lib/ipBan";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for registration request
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // Check if IP is banned before processing request
    await checkIpBan(request);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);

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

    const { username, email, password } = validationResult.data;

    // Attempt to register user
    const result = await registerUser({ username, email, password });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Registration failed",
        },
        { status: 400 },
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
      message: "Registration successful",
    });
  } catch (error) {
    console.error("Registration endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
