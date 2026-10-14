import { withApiSecurity } from "@/app/lib/apiSecurity";
import { getMailer } from "@/app/lib/mailer";
import { incrementMessageCount } from "@/app/lib/messageCounter";
import { sanitizeString } from "@/app/lib/sanitization";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const suggestionSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required").max(300),
  details: z.string().max(5000).optional(),
  email: z
    .union([z.string().email("Invalid email address").max(320), z.literal("")])
    .optional(),
  site: z.string().optional(), // honeypot field
});

/**
 * Emails a suggested wiki topic from the /topics hub to the site owner.
 */
export async function POST(request: NextRequest) {
  try {
    const { ip, validatedBody, error } = await withApiSecurity(request, {
      rateLimit: true,
      ipBan: true,
      captcha: true,
      validation: { schema: suggestionSchema },
    });
    if (error) return error;

    const { topic, details, email, site } = validatedBody as z.infer<
      typeof suggestionSchema
    >;

    // Reject honeypot submissions
    if (site) {
      return NextResponse.json({ success: true });
    }

    // Sanitize all fields before interpolating into HTML
    const safeTopic = sanitizeString(topic, 300);
    const safeDetails = details ? sanitizeString(details, 5000) : "";
    const safeEmail = email ? sanitizeString(email, 320) : "";

    const ok = await getMailer().sendMail({
      to: process.env.ZOHO_EMAIL!,
      subject: `detrans.ai Topic Suggestion: ${safeTopic}`,
      content:
        `<p><b>Topic:</b> ${safeTopic}</p>` +
        (safeEmail ? `<p><b>From:</b> ${safeEmail}</p>` : "") +
        (safeDetails ? `<p>${safeDetails}</p>` : ""),
    });

    // Increment message count for CAPTCHA tracking
    await incrementMessageCount(ip);

    return NextResponse.json({ success: ok });
  } catch (err) {
    console.error("Topic suggestion error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to send suggestion" },
      { status: 500 },
    );
  }
}
