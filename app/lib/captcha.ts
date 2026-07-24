/**
 * Verify an hCaptcha token directly with the hCaptcha API.
 * Used by /api/captcha/verify for count-based captcha verification.
 */
export async function verifyCaptchaToken(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn(
      "[CAPTCHA] HCAPTCHA_SECRET_KEY not set, skipping verification",
    );
    return false; //process.env.NODE_ENV === "development";
  }

  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("[CAPTCHA] Verification error:", error);
    return false;
  }
}
