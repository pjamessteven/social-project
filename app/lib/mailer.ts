type MailerOptions = {
  clientId: string;
  clientSecret: string;
  accountId: string;
  defaultFrom: string;
  region?: string; // e.g. "com", "com.au", "eu"
};
export class ZohoMailer {
  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private defaultFrom: string;
  private region: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(opts: MailerOptions) {
    if (!opts.clientId) throw new Error("ZohoMailer: clientId is required");
    if (!opts.clientSecret)
      throw new Error("ZohoMailer: clientSecret is required");
    if (!opts.accountId) throw new Error("ZohoMailer: accountId is required");
    if (!opts.defaultFrom)
      throw new Error("ZohoMailer: defaultFrom is required");

    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.accountId = opts.accountId;
    this.defaultFrom = opts.defaultFrom;
    this.region = opts.region ?? "com"; // default global

    console.log("[ZohoMailer] Initialized for region:", this.region);
  }

  private async getAccessToken(
    scope = "ZohoMail.messages.CREATE",
  ): Promise<string> {
    const now = Date.now() / 1000;
    if (this.accessToken && now < this.tokenExpiry - 60) {
      return this.accessToken;
    }

    const tokenUrl = `https://accounts.zoho.${this.region}/oauth/v2/token`;

    console.log("[ZohoMailer] Fetching access token from:", tokenUrl);
    console.log("[ZohoMailer] Client ID present:", !!this.clientId);
    console.log("[ZohoMailer] Client Secret present:", !!this.clientSecret);

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "client_credentials",
      scope,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    console.log("[ZohoMailer] Token response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[ZohoMailer] Token error:", errorText);
      throw new Error(
        `Failed to fetch access token: ${res.status} ${res.statusText} - ${errorText}`,
      );
    }

    const data = await res.json();

    if (data.error) {
      console.error("[ZohoMailer] Token error in response:", data);
      throw new Error(
        `Zoho OAuth error: ${data.error} - ${data.error_description || ""}`,
      );
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() / 1000 + (data.expires_in ?? 3600);

    if (!this.accessToken) {
      throw new Error("No access_token in Zoho response");
    }

    console.log("[ZohoMailer] Access token fetched successfully");
    return this.accessToken;
  }

  async sendMail({
    to,
    subject,
    content,
    contentType = "text/html",
    from,
  }: {
    to: string;
    subject: string;
    content: string;
    contentType?: "text/html" | "text/plain";
    from?: string;
  }): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const url = `https://mail.zoho.${this.region}/api/accounts/${this.accountId}/messages`;

      console.log("[ZohoMailer] Sending email to:", to);
      console.log("[ZohoMailer] API URL:", url);

      const body = {
        fromAddress: from ?? this.defaultFrom,
        toAddress: to,
        subject,
        content,
        mailFormat: contentType === "text/html" ? "html" : "plaintext",
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      console.log("[ZohoMailer] Send email response status:", res.status);

      if (!res.ok) {
        const errText = await res.text();
        console.error("[ZohoMailer] Send email error:", errText);
        return false;
      }

      console.log("[ZohoMailer] Email sent successfully");
      return true;
    } catch (error) {
      console.error("[ZohoMailer] Error in sendMail:", error);
      throw error;
    }
  }
}

// Singleton instance for standard configuration
let mailerInstance: ZohoMailer | null = null;

/**
 * Get or create the singleton ZohoMailer instance.
 * Uses environment variables: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_ACCOUNT_ID, ZOHO_EMAIL
 */
export function getMailer(): ZohoMailer {
  if (!mailerInstance) {
    mailerInstance = new ZohoMailer({
      clientId: process.env.ZOHO_CLIENT_ID!,
      clientSecret: process.env.ZOHO_CLIENT_SECRET!,
      accountId: process.env.ZOHO_ACCOUNT_ID!,
      defaultFrom: process.env.ZOHO_EMAIL!,
      region: "com.au",
    });
  }
  return mailerInstance;
}
