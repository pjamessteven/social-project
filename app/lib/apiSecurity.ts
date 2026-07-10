import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { type ZodSchema, ZodError } from "zod";
import { getCurrentSession, isAdmin, isModeratorOrAdmin, type SessionPayload } from "./auth/auth";
import { isIpBanned } from "./ipBan";
import { checkRateLimit, type RateLimitConfig } from "./rateLimit";
import { isCaptchaRequired } from "./messageCounter";
import { getIP } from "./getIp";

export type AuthLevel = "none" | "user" | "moderator" | "admin";

export interface ApiSecurityOptions {
  rateLimit?: boolean | Partial<RateLimitConfig>;
  ipBan?: boolean;
  captcha?: boolean;
  auth?: AuthLevel;
  /** Force session retrieval even when auth is "none". Useful for routes that use session for tracking. */
  getSession?: boolean;
  validation?: {
    schema: ZodSchema;
  };
}

export interface ApiSecurityResult {
  session: SessionPayload | null;
  ip: string;
  validatedBody?: unknown;
  error?: NextResponse;
}

/**
 * Centralized API security middleware.
 *
 * Applies IP ban checks, rate limiting, authentication, captcha, and input
 * validation in a single call. Returns the session and validated body on
 * success, or an error response on failure.
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const { session, ip, validatedBody, error } = await withApiSecurity(request, {
 *     rateLimit: true,
 *     ipBan: true,
 *     captcha: true,
 *     auth: "none",
 *     validation: { schema: myZodSchema },
 *   });
 *   if (error) return error;
 *
 *   // ... route logic
 * }
 * ```
 */
export async function withApiSecurity(
  request: NextRequest,
  options: ApiSecurityOptions = {},
): Promise<ApiSecurityResult> {
  const ip = getIP(request);

  // 1. IP ban check
  if (options.ipBan) {
    if (await isIpBanned(ip)) {
      return {
        session: null,
        ip,
        error: NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        ),
      };
    }
  }

  // 2. Rate limit check
  if (options.rateLimit) {
    const config =
      typeof options.rateLimit === "object" ? options.rateLimit : undefined;
    const rateLimitResponse = await checkRateLimit(request, config);
    if (rateLimitResponse) {
      return { session: null, ip, error: rateLimitResponse };
    }
  }

  // 3. Input validation (parse body early so it's available)
  let validatedBody: unknown | undefined;
  if (options.validation) {
    try {
      const body = await request.clone().json();
      validatedBody = options.validation.schema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        return {
          session: null,
          ip,
          error: NextResponse.json(
            {
              success: false,
              error: "Invalid request data",
              details: err.format(),
            },
            { status: 400 },
          ),
        };
      }
      return {
        session: null,
        ip,
        error: NextResponse.json(
          { success: false, error: "Invalid request body" },
          { status: 400 },
        ),
      };
    }
  }

  // 4. Authentication
  let session: SessionPayload | null = null;
  const needsSession =
    (options.auth !== undefined && options.auth !== "none") ||
    options.captcha ||
    options.getSession;

  if (needsSession) {
    session = await getCurrentSession();
  }

  if (options.auth === "user" && !session) {
    return {
      session: null,
      ip,
      error: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  if (options.auth === "admin") {
    if (!session) {
      return {
        session: null,
        ip,
        error: NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 },
        ),
      };
    }
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return {
        session: null,
        ip,
        error: NextResponse.json(
          { success: false, error: "Admin privileges required" },
          { status: 403 },
        ),
      };
    }
  }

  if (options.auth === "moderator") {
    if (!session) {
      return {
        session: null,
        ip,
        error: NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 },
        ),
      };
    }
    const modCheck = await isModeratorOrAdmin();
    if (!modCheck) {
      return {
        session: null,
        ip,
        error: NextResponse.json(
          {
            success: false,
            error: "Moderator or admin privileges required",
          },
          { status: 403 },
        ),
      };
    }
  }

  // 5. Captcha check (only for non-logged-in users)
  if (options.captcha && !session) {
    const captchaRequired = await isCaptchaRequired(ip);
    if (captchaRequired) {
      return {
        session,
        ip,
        error: NextResponse.json(
          {
            requiresCaptcha: true,
            error: "CAPTCHA verification required",
          },
          { status: 402 },
        ),
      };
    }
  }

  return { session, ip, validatedBody, error: undefined };
}
