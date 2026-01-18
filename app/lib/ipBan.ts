import { db } from "@/db";
import { bannedUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

/**
 * Check if an IP address is banned
 * @param ipAddress The IP address to check
 * @returns Promise<boolean> True if the IP is banned, false otherwise
 */
export async function isIpBanned(ipAddress: string): Promise<boolean> {
  if (!ipAddress || ipAddress === "unknown") {
    return false;
  }

  try {
    const banned = await db
      .select()
      .from(bannedUsers)
      .where(eq(bannedUsers.ipAddress, ipAddress))
      .limit(1);

    return banned.length > 0;
  } catch (error) {
    console.error("Error checking IP ban status:", error);
    // If there's an error checking the ban status, allow the request
    // to avoid blocking legitimate users due to database issues
    return false;
  }
}

/**
 * Get IP address from request with comprehensive header checking
 * @param req The NextRequest object
 * @returns The IP address or "unknown" if not found
 */
export function getIpFromRequest(req: NextRequest): string {
  // Try x-forwarded-for first (common in proxy setups)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, the first one is the client
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    return ips[0];
  }

  // Try x-real-ip
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Try forwarded header (standard format)
  const forwardedHeader = req.headers.get("forwarded");
  if (forwardedHeader) {
    // Parse Forwarded header format: for=192.0.2.60;proto=http;by=203.0.113.43
    const forMatch = forwardedHeader.match(/for=([^;,\s]+)/i);
    if (forMatch && forMatch[1]) {
      // Remove quotes if present
      return forMatch[1].replace(/"/g, "");
    }
  }

  // Try cf-connecting-ip (Cloudflare)
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Try true-client-ip (Akamai and some other proxies)
  const trueClientIp = req.headers.get("true-client-ip");
  if (trueClientIp) {
    return trueClientIp;
  }

  // Fallback for local development or when no headers are available
  return "unknown";
}

/**
 * Check if request comes from a banned IP and throw an error if banned
 * @param req The NextRequest object
 * @throws {Error} If the IP is banned
 */
export async function checkIpBan(req: NextRequest): Promise<void> {
  const ipAddress = getIpFromRequest(req);

  if (await isIpBanned(ipAddress)) {
    throw new Error();
  }
}

/**
 * Add an IP address to the ban list
 * @param ipAddress The IP address to ban
 * @param reason Optional reason for the ban
 * @param bannedBy Optional identifier of who banned the IP
 * @returns Promise<void>
 */
export async function banIp(
  ipAddress: string,
  reason?: string,
  bannedBy?: string,
): Promise<void> {
  if (!ipAddress || ipAddress === "unknown") {
    throw new Error("Invalid IP address");
  }

  try {
    // Check if already banned
    const alreadyBanned = await isIpBanned(ipAddress);
    if (alreadyBanned) {
      return; // Already banned, nothing to do
    }

    await db.insert(bannedUsers).values({
      ipAddress,
      reason: reason || null,
      bannedBy: bannedBy || null,
    });

    console.log(
      `IP ${ipAddress} has been banned. Reason: ${reason || "No reason provided"}`,
    );
  } catch (error) {
    console.error("Error banning IP:", error);
    throw new Error(
      `Failed to ban IP ${ipAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Remove an IP address from the ban list
 * @param ipAddress The IP address to unban
 * @returns Promise<void>
 */
export async function unbanIp(ipAddress: string): Promise<void> {
  if (!ipAddress || ipAddress === "unknown") {
    throw new Error("Invalid IP address");
  }

  try {
    await db.delete(bannedUsers).where(eq(bannedUsers.ipAddress, ipAddress));

    console.log(`IP ${ipAddress} has been unbanned`);
  } catch (error) {
    console.error("Error unbanning IP:", error);
    throw new Error(
      `Failed to unban IP ${ipAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get all banned IPs with their details
 * @returns Promise<Array<{ipAddress: string, reason: string | null, bannedBy: string | null, createdAt: Date}>>
 */
export async function getBannedIps(): Promise<
  Array<{
    ipAddress: string;
    reason: string | null;
    bannedBy: string | null;
    createdAt: Date;
  }>
> {
  try {
    const banned = await db
      .select({
        ipAddress: bannedUsers.ipAddress,
        reason: bannedUsers.reason,
        bannedBy: bannedUsers.bannedBy,
        createdAt: bannedUsers.createdAt,
      })
      .from(bannedUsers)
      .orderBy(bannedUsers.createdAt);

    return banned;
  } catch (error) {
    console.error("Error fetching banned IPs:", error);
    return [];
  }
}
