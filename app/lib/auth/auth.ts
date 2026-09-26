import { db } from "@/db";
import { users } from "@/db/schema";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required in production");
}
if (process.env.NODE_ENV !== "production" && !process.env.JWT_SECRET) {
  // Keep the stable dev fallback below (an ephemeral secret would log you out
  // on every restart), but never let it pass silently.
  console.warn(
    "[auth] JWT_SECRET is not set — sessions are signed with a well-known dev fallback. Fine locally, never deploy like this.",
  );
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production",
);
// Cookie names are shared per HOST — ports do not isolate them. Both the
// detrans dev server (localhost:3001) and other local apps (e.g. agent-wiki on
// localhost:3000) would otherwise fight over "session_token", each overwriting
// the other's token and logging you out. Production keeps the plain name: the
// other detrans.ai apps deliberately clear it on logout (shared sign-out).
const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ||
  (process.env.NODE_ENV === "production"
    ? "session_token"
    : "detrans_session_token");
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
const SESSION_REFRESH_THRESHOLD = 60 * 60 * 24 * 14; // Refresh if less than 14 days remaining
const MAGIC_LINK_EXPIRY_MINUTES = 15; // Magic links expire after 15 minutes

export interface SessionPayload {
  userId: number;
  username: string; // This is the email address
  role: string;
}

/**
 * The origin the browser used to reach us (including its port) — needed for
 * building host-facing links and redirects. `request.nextUrl.origin` is NOT
 * reliable here: behind Docker's port publish (host :3001 -> container :3000)
 * it reports the container's internal port, so use the Host header.
 */
export function getRequestOrigin(request: {
  headers: { get(name: string): string | null };
  nextUrl: { origin: string; protocol: string };
}): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto = (
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol ??
    "http:"
  ).replace(/:$/, "");
  return `${proto}://${host}`;
}

// Create JWT token
export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export interface SessionResult {
  payload: SessionPayload;
  expiresAt: number; // Unix timestamp in seconds
}

// Verify JWT token
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  const result = await verifySessionTokenWithExpiry(token);
  return result?.payload ?? null;
}

// Verify JWT token and return with expiration
export async function verifySessionTokenWithExpiry(
  token: string,
): Promise<SessionResult | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Extract and validate the payload
    const sessionPayload: SessionPayload = {
      userId: Number(payload.userId),
      username: String(payload.username),
      role: String(payload.role),
    };

    // Get expiration time from the exp claim
    const expiresAt = payload.exp ?? 0;

    return { payload: sessionPayload, expiresAt };
  } catch (error) {
    return null;
  }
}

// Refresh session cookie if needed (sliding expiration)
export async function refreshSessionIfNeeded(
  sessionResult: SessionResult,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const timeRemaining = sessionResult.expiresAt - now;

  // If less than threshold remaining, refresh the session
  if (timeRemaining < SESSION_REFRESH_THRESHOLD) {
    await setSessionCookie(sessionResult.payload);
  }
}

// Get current session from cookies
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const result = await verifySessionTokenWithExpiry(token);

  if (!result) {
    return null;
  }

  // Refresh session if it's getting close to expiration
  await refreshSessionIfNeeded(result);

  return result.payload;
}

/**
 * Role changes (promotion/demotion) don't propagate through long-lived JWT
 * sessions, so privileged checks read the current role from the database and
 * only fall back to the session claim.
 */
export async function getFreshRole(
  userId: number,
  fallbackRole: string,
): Promise<string> {
  try {
    const rows = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0]?.role ?? fallbackRole;
  } catch (error) {
    console.error("Fresh role lookup failed:", error);
    return fallbackRole;
  }
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;
  const role = await getFreshRole(session.userId, session.role);
  return role === "admin";
}

// Check if user is moderator or admin
export async function isModeratorOrAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;
  const role = await getFreshRole(session.userId, session.role);
  return role === "admin" || role === "moderator";
}

// Generate a secure random magic link token
export function generateMagicToken(): string {
  return randomBytes(32).toString("hex");
}

export async function requestMagicLink(email: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  magicToken?: string;
  userId?: number;
}> {
  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedEmail))
      .limit(1);

    if (!user[0]) {
      return {
        success: true,
        message:
          "If you have an account, you will receive a magic link shortly.",
      };
    }

    // Check if user is active
    if (!user[0].isActive) {
      return {
        success: true,
        message:
          "If you have an account, you will receive a magic link shortly.",
      };
    }

    // Generate magic token
    const magicToken = generateMagicToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + MAGIC_LINK_EXPIRY_MINUTES);

    // Store token in database
    await db
      .update(users)
      .set({
        magicLinkToken: magicToken,
        magicLinkExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user[0].id));

    return {
      success: true,
      message: "Magic link generated",
      magicToken,
      userId: user[0].id,
    };
  } catch (error) {
    console.error("Magic link request error:", error);
    return { success: false, error: "Internal server error" };
  }
}

// Verify magic link and create session
export async function verifyMagicLink(
  token: string,
): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
  try {
    // Find user by magic token
    const user = await db
      .select()
      .from(users)
      .where(eq(users.magicLinkToken, token))
      .limit(1);

    if (!user[0]) {
      return { success: false, error: "Invalid or expired magic link" };
    }

    // Check if token is expired
    const now = new Date();
    if (!user[0].magicLinkExpiresAt || user[0].magicLinkExpiresAt < now) {
      return { success: false, error: "Magic link has expired" };
    }

    // Check if user is active
    if (!user[0].isActive) {
      return { success: false, error: "Account is deactivated" };
    }

    // Clear the magic link token (one-time use)
    await db
      .update(users)
      .set({
        magicLinkToken: null,
        magicLinkExpiresAt: null,
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user[0].id));

    // Create session payload
    const sessionPayload: SessionPayload = {
      userId: user[0].id,
      username: user[0].username,
      role: user[0].role,
    };

    return { success: true, user: sessionPayload };
  } catch (error) {
    console.error("Magic link verification error:", error);
    return { success: false, error: "Internal server error" };
  }
}

// Set session cookie
export async function setSessionCookie(
  sessionPayload: SessionPayload,
): Promise<void> {
  const token = await createSessionToken(sessionPayload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax" (not "strict"): strict cookies are not sent on top-level
    // navigations from outside the site, so arriving via an email/magic link
    // or a link from another app looks like a logout. Lax keeps that working
    // while still withholding cookies from cross-site non-GET requests.
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

// Clear session cookie (logout)
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  // Also sweep the legacy/shared name: older builds (and the cross-app shared
  // cookie) used "session_token", and a stale copy would keep being sent.
  for (const name of new Set([SESSION_COOKIE_NAME, "session_token"])) {
    cookieStore.delete(name);
  }
}

// Create admin user (for initial setup) - now just email, no password
export async function createAdminUser(email: string): Promise<boolean> {
  try {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (existingAdmin[0]) {
      console.log("Admin user already exists");
      return false;
    }

    // Create admin user (no password needed)
    await db.insert(users).values({
      username: normalizedEmail,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Admin user created successfully:", normalizedEmail);
    return true;
  } catch (error) {
    console.error("Error creating admin user:", error);
    return false;
  }
}

// Add user to whitelist (admin only)
export async function addUserToWhitelist(
  email: string,
  role: string = "user",
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedEmail))
      .limit(1);

    if (existingUser[0]) {
      return { success: false, error: "User already exists" };
    }

    // Create user
    await db.insert(users).values({
      username: normalizedEmail,
      role: role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error adding user to whitelist:", error);
    return { success: false, error: "Internal server error" };
  }
}

// Remove user from whitelist (admin only)
export async function removeUserFromWhitelist(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Cannot delete the last admin
    const userToDelete = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedEmail))
      .limit(1);

    if (!userToDelete[0]) {
      return { success: false, error: "User not found" };
    }

    if (userToDelete[0].role === "admin") {
      const adminCount = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"));

      if (adminCount.length <= 1) {
        return { success: false, error: "Cannot delete the last admin" };
      }
    }

    // Delete user
    await db.delete(users).where(eq(users.username, normalizedEmail));

    return { success: true };
  } catch (error) {
    console.error("Error removing user from whitelist:", error);
    return { success: false, error: "Internal server error" };
  }
}

// Get all whitelisted users (admin only)
export async function getWhitelistedUsers(): Promise<
  Array<{
    id: number;
    username: string;
    role: string;
    isActive: boolean;
    lastLogin: Date | null;
    createdAt: Date;
  }>
> {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    return allUsers;
  } catch (error) {
    console.error("Error fetching whitelisted users:", error);
    return [];
  }
}
