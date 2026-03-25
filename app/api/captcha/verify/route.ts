import { getIpFromRequest } from "@/app/lib/ipBan";
import { initializeMessageCount } from "@/app/lib/messageCounter";
import { connectRedis } from "@/app/lib/redis";
import { NextRequest, NextResponse } from "next/server";

// hCaptcha secret key from environment
const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY;

// Verify hCaptcha token with hCaptcha API
async function verifyHCaptcha(token: string): Promise<boolean> {
  if (!HCAPTCHA_SECRET_KEY) {
    console.warn("HCAPTCHA_SECRET_KEY not set, skipping verification");
    return true;
  }

  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: HCAPTCHA_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("hCaptcha verification error:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "CAPTCHA token required" },
        { status: 400 },
      );
    }

    // Verify the CAPTCHA token
    const isValid = await verifyHCaptcha(token);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "CAPTCHA verification failed" },
        { status: 400 },
      );
    }

    // Mark this IP as verified in Redis (expires after 1 hour)
    // Also reset the message counter for this IP
    const redis = await connectRedis();
    const ip = getIpFromRequest(req);

    if (redis) {
      const key = `captcha:verified:${ip}`;
      await redis.setEx(key, 3600, "1"); // 1 hour TTL
    }

    // Initialize message count for this IP after CAPTCHA verification (sets to 0)
    await initializeMessageCount(ip);

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
