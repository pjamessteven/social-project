import { incrementMessageCount } from "@/app/lib/messageCounter";
import { withApiSecurity } from "@/app/lib/apiSecurity";
import { sanitizeString } from "@/app/lib/sanitization";
import { NextRequest, NextResponse } from "next/server";
import { ZohoMailer } from "../../lib/mailer";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address").max(320),
  subject: z.string().min(1, "Subject is required").max(500),
  message: z.string().min(1, "Message is required").max(5000),
  site: z.string().optional(), // honeypot field
});

function getMailer() {
  return new ZohoMailer({
    clientId: process.env.ZOHO_CLIENT_ID!,
    clientSecret: process.env.ZOHO_CLIENT_SECRET!,
    accountId: process.env.ZOHO_ACCOUNT_ID!,
    defaultFrom: process.env.ZOHO_EMAIL!,
    region: "com.au",
  });
}

export async function POST(request: NextRequest) {
  try {
    const { ip, validatedBody, error } = await withApiSecurity(request, {
      rateLimit: true,
      ipBan: true,
      captcha: true,
      validation: { schema: contactSchema },
    });
    if (error) return error;

    const { name, email, subject, message, site } = validatedBody as z.infer<typeof contactSchema>;

    // Reject honeypot submissions
    if (site) {
      return NextResponse.json({ success: true });
    }

    // Sanitize all fields before interpolating into HTML
    const safeName = sanitizeString(name, 200);
    const safeEmail = sanitizeString(email, 320);
    const safeSubject = sanitizeString(subject, 500);
    const safeMessage = sanitizeString(message, 5000);

    const ok = await getMailer().sendMail({
      to: process.env.ZOHO_EMAIL!,
      subject: `detrans.ai Contact Form: ${safeName}: ${safeSubject}`,
      content: `<p><b>From:</b> ${safeName} (${safeEmail}): <br/><b>Subject:</b>${safeSubject}</p><p>${safeMessage}</p>`,
    });

    // Increment message count for CAPTCHA tracking
    await incrementMessageCount(ip);

    return NextResponse.json({ success: ok });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 500 },
    );
  }
}
