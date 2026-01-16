// social-project/app/lib/geolocation.ts

/**
 * Get country from IP address using ipinfo.io
 *
 * Environment variable (optional but recommended):
 * - IPINFO_TOKEN: Free token from https://ipinfo.io/account/token
 *   Without token: 50,000 requests/month
 *   With free token: 50,000 requests/month (more reliable)
 *
 * Usage:
 * ```typescript
 * import { getCountryFromIP } from "@/app/lib/geolocation";
 *
 * const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
 * const country = await getCountryFromIP(ipAddress);
 *
 * if (country) {
 *   console.log(`User is from ${country}`);
 *   // Store country in database
 * }
 * ```
 */
export async function getCountryFromIP(ip: string): Promise<string | null> {
  // Skip for local IPs, unknown, or invalid IPs
  if (
    !ip ||
    ip === "unknown" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.")
  ) {
    return null;
  }

  // Also skip IPv6 local addresses
  if (ip === "::1" || ip.startsWith("fc00:") || ip.startsWith("fe80:")) {
    return null;
  }

  // Get IPINFO_TOKEN from environment
  const ipinfoToken = process.env.IPINFO_TOKEN;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    let url: string;
    if (ipinfoToken) {
      // Use the /lite endpoint with token for better performance
      url = `https://api.ipinfo.io/lite/${ip}?token=${ipinfoToken}`;
    } else {
      // Use standard endpoint without token
      url = `https://ipinfo.io/${ip}/json`;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "SocialProject/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`ipinfo.io rate limit reached for IP: ${ip}`);
      } else if (response.status === 403) {
        console.warn(`ipinfo.io token invalid or expired for IP: ${ip}`);
      } else {
        console.warn(
          `ipinfo.io responded with status: ${response.status} for IP: ${ip}`,
        );
      }
      return null;
    }

    const data = await response.json();

    // Handle both response formats
    let countryCode: string | undefined;

    if (ipinfoToken) {
      // /lite endpoint returns { country_code: "US" }
      countryCode = data.country_code;
    } else {
      // Standard endpoint returns { country: "US" }
      countryCode = data.country;
    }

    if (
      countryCode &&
      typeof countryCode === "string" &&
      countryCode.length === 2
    ) {
      return countryCode.toUpperCase();
    }

    return null;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(`ipinfo.io timeout for IP: ${ip}`);
      } else {
        console.warn(`ipinfo.io error for IP: ${ip}:`, error.message);
      }
    }
    return null;
  }
}
