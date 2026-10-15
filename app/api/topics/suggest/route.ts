import { withApiSecurity } from "@/app/lib/apiSecurity";
import { getMailer } from "@/app/lib/mailer";
import { incrementMessageCount } from "@/app/lib/messageCounter";
import { sanitizeString } from "@/app/lib/sanitization";
import { SITE_URL } from "@/app/lib/seo";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const suggestionSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required").max(300),
  details: z.string().max(5000).optional(),
  email: z
    .union([z.string().email("Invalid email address").max(320), z.literal("")])
    .optional(),
  site: z.string().optional(), // honeypot field
  // Set when sent from a topic page: its default-locale path (link built
  // here, so no arbitrary URLs reach the email) and title.
  pagePath: z
    .string()
    .max(500)
    .regex(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/)
    .optional(),
  pageTitle: z.string().max(300).optional(),
});

/**
 * Emails a wiki suggestion (a new topic or article, or an improvement) to the
 * site owner. Suggestions sent from a topic page name and link that page.
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

    const { topic, details, email, site, pagePath, pageTitle } =
      validatedBody as z.infer<typeof suggestionSchema>;

    // Reject honeypot submissions
    if (site) {
      return NextResponse.json({ success: true });
    }

    // Sanitize all fields before interpolating into HTML
    const safeTopic = sanitizeString(topic, 300);
    const safeDetails = details ? sanitizeString(details, 5000) : "";
    const safeEmail = email ? sanitizeString(email, 320) : "";
    const safePageTitle = pageTitle ? sanitizeString(pageTitle, 300) : "";
    const pageUrl = pagePath ? `${SITE_URL}/en/topics/${pagePath}` : "";

    const ok = await getMailer().sendMail({
      to: process.env.ZOHO_EMAIL!,
      subject: pagePath
        ? `detrans.ai Suggestion for "${safePageTitle || pagePath}": ${safeTopic}`
        : `detrans.ai Topic Suggestion: ${safeTopic}`,
      content:
        (pagePath
          ? `<p><b>Page:</b> <a href="${pageUrl}">${safePageTitle || pagePath}</a></p>`
          : "") +
        `<p><b>Suggestion:</b> ${safeTopic}</p>` +
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
