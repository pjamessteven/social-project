import { NextRequest } from "next/server";

/**
 * Normalize an IP address string:
 * - Strips IPv6-mapped IPv4 prefix (::ffff:)
 * - Trims whitespace
 * - Handles bracketed IPv6 addresses ([::1])
 */
function normalizeIP(ip: string): string {
  let normalized = ip.trim();

  // Remove brackets from IPv6 addresses (e.g., [::1] → ::1)
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }

  // Strip IPv6-mapped IPv4 prefix: ::ffff:1.2.3.4 → 1.2.3.4
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    // Only strip if the remainder is a valid IPv4
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(mapped)) {
      normalized = mapped;
    }
  }

  return normalized;
}

function isValidIP(ip: string): boolean {
  if (!ip || ip === "unknown") return false;

  const normalized = normalizeIP(ip);

  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(normalized)) {
    return normalized.split(".").every((octet) => {
      const n = Number(octet);
      return n >= 0 && n <= 255;
    });
  }

  // IPv6 (simplified check — valid hex chars and colons)
  if (/^[0-9a-fA-F:]+$/.test(normalized) && normalized.includes(":")) {
    return true;
  }

  return false;
}

/**
 * Extract the first valid IP from a header value that may contain
 * multiple comma-separated IPs (e.g., "1.2.3.4, 5.6.7.8").
 * Returns null if no valid IP found.
 */
function extractFirstIP(headerValue: string | null): string | null {
  if (!headerValue) return null;

  // Split by comma and take the first valid IP
  const ips = headerValue.split(",").map((ip) => ip.trim());

  for (const ip of ips) {
    const normalized = normalizeIP(ip);
    if (isValidIP(normalized)) {
      return normalized;
    }
  }

  return null;
}

/**
 * Extract the real client IP from a request.
 *
 * Priority:
 *  1. cf-connecting-ip  — set by Cloudflare, client cannot spoof
 *  2. x-real-ip         — set by nginx ($remote_addr), client cannot spoof
 *  3. x-forwarded-for   — ONLY trusted when TRUSTED_PROXY_COUNT or
 *                         TRUSTED_PROXY_IPS is configured. Otherwise ignored
 *                         because clients can spoof it.
 *
 * Returns "unknown" if no trustworthy IP is found.
 */
export function getIP(req: Request | NextRequest): string {
  // 1. Cloudflare — most trustworthy, client cannot set this
  //    May contain multiple IPs in some edge cases; take the first valid one
  const cfIP = extractFirstIP(req.headers.get("cf-connecting-ip"));
  if (cfIP) return cfIP;

  // 2. nginx real IP — set from $remote_addr, client cannot set this
  const realIP = extractFirstIP(req.headers.get("x-real-ip"));
  if (realIP) return realIP;

  // 3. x-forwarded-for — only trusted when proxy config is set
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const trustedCount = Number(process.env.TRUSTED_PROXY_COUNT) || 0;
    const trustedIPs = (process.env.TRUSTED_PROXY_IPS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (trustedCount > 0 || trustedIPs.length > 0) {
      const ips = forwardedFor
        .split(",")
        .map((ip) => normalizeIP(ip.trim()));

      let clientIP: string;
      if (trustedIPs.length > 0) {
        // Take the first IP NOT in the trusted list
        clientIP =
          ips.find((ip) => !trustedIPs.includes(ip)) ||
          ips[ips.length - 1];
      } else {
        // Take IP at position (length - 1 - trustedCount) from the left
        const idx = ips.length - 1 - trustedCount;
        clientIP = idx >= 0 ? ips[idx] : ips[0];
      }

      if (clientIP && isValidIP(clientIP)) return clientIP;
    }
    // If no trusted proxy config, x-forwarded-for is ignored entirely
  }

  return "unknown";
}
