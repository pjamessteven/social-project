// social-project/app/lib/geolocation.ts
import { formatCountryDisplay } from "./countries";

/**
 * Get country from IP address using ipapi.co
 * Free tier: 1,000 requests per day
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

  // Also skip IPv6 local addresses and other private ranges
  if (ip === "::1" || ip.startsWith("fc00:") || ip.startsWith("fe80:")) {
    return null;
  }

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(
        `IP API responded with status: ${response.status} for IP: ${ip}`,
      );
      return null;
    }

    const data = await response.json();

    // Return formatted country display if country code is available
    const countryCode = data.country_code;
    if (countryCode) {
      return formatCountryDisplay(countryCode);
    }
    return null;
  } catch (error) {
    // Don't log timeouts or network errors as errors
    if (error instanceof Error && error.name === "TimeoutError") {
      console.warn(`Timeout getting country for IP: ${ip}`);
    } else if (error instanceof Error && error.name === "AbortError") {
      console.warn(`Request aborted for IP: ${ip}`);
    } else {
      console.error("Error getting country from IP:", error);
    }
    return null;
  }
}
