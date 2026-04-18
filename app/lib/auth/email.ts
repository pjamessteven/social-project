// Email service using the existing mailer
import { getMailer } from "../mailer";

export interface MagicLinkEmailData {
  email: string;
  magicToken: string;
  userId: number;
}

/**
 * Send magic link email
 */
export async function sendMagicLinkEmail(
  data: MagicLinkEmailData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const magicLink = `${appUrl}/api/auth/verify?token=${data.magicToken}`;

    const subject = "Your Magic Login Link";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Magic Login Link</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #111827;
            font-size: 24px;
            margin: 0;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          .expiry {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Login to detrans.ai</h1>
          </div>
          
          <p>Hello,</p>
          
          <p>You requested a magic link to log in to your account.</p>
          <p>Click the button below to sign in:</p>
          
          <div style="text-align: center;">
            <a href="${magicLink}" class="button">Log In to My Account</a>
          </div>
          
          <div class="expiry">
            <strong>Important:</strong> This link will expire in 15 minutes and can only be used once.
          </div>
          
          <p>If you didn't request this link, you can safely ignore this email.</p>
          
          <p>Alternatively, you can copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${magicLink}</p>
          
          <div class="footer">
            <p>This email was sent by detrans.ai</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailer = getMailer();
    const success = await mailer.sendMail({
      to: data.email,
      subject: subject,
      content: htmlContent,
      contentType: "text/html",
    });

    if (success) {
      console.log(`[Email] Magic link sent to: ${data.email}`);
      return { success: true };
    } else {
      return { success: false, error: "Failed to send email" };
    }
  } catch (error) {
    console.error("[Email] Error sending magic link:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
