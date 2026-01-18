import { checkIpBan } from "@/app/lib/ipBan";
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
    // Check if IP is banned before processing request
    await checkIpBan(request);

    const { name, email, subject, message, site } = await request.json();

    const ok = await mailer.sendMail({
      to: process.env.ZOHO_EMAIL!,
      subject: `${site == "detrans" ? "detrans.ai" : "genderaffirming.ai"} Contact Form: ${name}: ${subject}`,
      content: `<p><b>From:</b> ${name} (${email}): <br/><b>Subject:</b>${subject}</p><p>${message}</p>`,
    });

    return NextResponse.json({ success: ok });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 500 },
    );
  }
}
