import { checkIpBan, getIpFromRequest } from "@/app/lib/ipBan";
import {
  getMessagesUntilCaptchaRequired,
  incrementMessageCount,
  isCaptchaRequired,
} from "@/app/lib/messageCounter";
import { checkRateLimit } from "@/app/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";
import { ZohoMailer } from "../../lib/mailer";

const mailer = new ZohoMailer({
  clientId: process.env.ZOHO_CLIENT_ID!,
  clientSecret: process.env.ZOHO_CLIENT_SECRET!,
  accountId: process.env.ZOHO_ACCOUNT_ID!,
  defaultFrom: process.env.ZOHO_EMAIL!,
  region: "com.au", // adjust if your account is in AU
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (10/min, 100/hour)
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Check if IP is banned before processing request
    await checkIpBan(request);

    // Check CAPTCHA requirement
    const ipAddress = getIpFromRequest(request);
    const captchaRequired = await isCaptchaRequired(ipAddress);
    if (captchaRequired) {
      const messagesUntilCaptcha =
        await getMessagesUntilCaptchaRequired(ipAddress);
      const messageText =
        messagesUntilCaptcha === 0
          ? "Please complete the CAPTCHA to continue."
          : `Please complete the CAPTCHA to continue. You have ${messagesUntilCaptcha} message${messagesUntilCaptcha === 1 ? "" : "s"} remaining before CAPTCHA is required again.`;
      return NextResponse.json(
        {
          requiresCaptcha: true,
          message: messageText,
          error: "CAPTCHA verification required",
          messagesUntilCaptcha,
        },
        { status: 402 },
      );
    }

    const { name, email, subject, message, site } = await request.json();

    const ok = await mailer.sendMail({
      to: process.env.ZOHO_EMAIL!,
      subject: `${site == "detrans" ? "detrans.ai" : "genderaffirming.ai"} Contact Form: ${name}: ${subject}`,
      content: `<p><b>From:</b> ${name} (${email}): <br/><b>Subject:</b>${subject}</p><p>${message}</p>`,
    });

    // Increment message count for CAPTCHA tracking
    await incrementMessageCount(ipAddress);

    return NextResponse.json({ success: ok });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 500 },
    );
  }
}
