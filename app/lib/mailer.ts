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
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.accountId = opts.accountId;
    this.defaultFrom = opts.defaultFrom;
    this.region = opts.region ?? "com"; // default global
  }

  private async getAccessToken(
    scope = "ZohoMail.messages.CREATE",
  ): Promise<string> {
    const now = Date.now() / 1000;
    if (this.accessToken && now < this.tokenExpiry - 60) {
      return this.accessToken;
    }

    const tokenUrl = `https://accounts.zoho.${this.region}/oauth/v2/token`;
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

    if (!res.ok) {
      throw new Error(`Failed to fetch access token: ${res.statusText}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() / 1000 + (data.expires_in ?? 3600);

    if (!this.accessToken) {
      throw new Error("No access_token in Zoho response");
    }

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
    const token = await this.getAccessToken();
    const url = `https://mail.zoho.${this.region}/api/accounts/${this.accountId}/messages`;
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

    if (!res.ok) {
      const errText = await res.text();
      console.error("Zoho sendMail error:", errText);
      return false;
    }

    return true;
  }
}
