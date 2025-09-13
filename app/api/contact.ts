import type { NextApiRequest, NextApiResponse } from "next";
import { ZohoMailer } from "../lib/mailer";

const mailer = new ZohoMailer({
  clientId: process.env.ZOHO_CLIENT_ID!,
  clientSecret: process.env.ZOHO_CLIENT_SECRET!,
  accountId: process.env.ZOHO_ACCOUNT_ID!,
  defaultFrom: process.env.ZOHO_EMAIL!,
  region: "com.au", // adjust if your account is in AU
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  const { name, email, subject, message, site } = req.body;

  const ok = await mailer.sendMail({
    to: process.env.ZOHO_EMAIL!,
    subject: `${site == "detrans" ? "detrans.ai" : "genderaffirming.ai"} ${name}: ${subject}`,
    content: `<p><b>From:</b> ${email}: ${subject}</p><p>${message}</p>`,
  });

  res.status(ok ? 200 : 500).json({ success: ok });
}
