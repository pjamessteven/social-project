import { NextRequest } from "next/server";

function isValidIP(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split(".").every((octet) => {
      const n = Number(octet);
      return n >= 0 && n <= 255;
    });
  }
  // IPv6 (simplified)
  if (/^[0-9a-fA-F:]+$/.test(ip) && ip.includes(":")) {
    return true;
  }
  return false;
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
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP && isValidIP(cfIP)) return cfIP;

  // 2. nginx real IP — set from $remote_addr, client cannot set this
  const realIP = req.headers.get("x-real-ip");
  if (realIP && isValidIP(realIP)) return realIP;

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
        .map((ip) => ip.trim().replace(/^::ffff:/, ""));

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