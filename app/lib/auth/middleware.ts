import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, isAdmin, isModeratorOrAdmin } from "./auth";

export interface AuthOptions {
  requireAdmin?: boolean;
  requireModerator?: boolean;
  requireAuth?: boolean;
}

/**
 * Middleware helper to protect API routes
 * Returns the session if authenticated, otherwise returns null
 */
export async function requireAuth(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{ session: any; errorResponse: NextResponse | null }> {
  const { requireAdmin = false, requireModerator = false, requireAuth = true } = options;

  // Get current session
  const session = await getCurrentSession();

  // If no authentication required, return session (could be null)
  if (!requireAuth && !requireAdmin && !requireModerator) {
    return { session, errorResponse: null };
  }

  // Check if authentication is required
  if (requireAuth && !session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      ),
    };
  }

  // Check if admin is required
  if (requireAdmin && session) {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return {
        session: null,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: "Admin privileges required",
          },
          { status: 403 }
        ),
      };
    }
  }

  // Check if moderator or admin is required
  if (requireModerator && session) {
    const moderatorCheck = await isModeratorOrAdmin();
    if (!moderatorCheck) {
      return {
        session: null,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: "Moderator or admin privileges required",
          },
          { status: 403 }
        ),
      };
    }
  }

  return { session, errorResponse: null };
}

/**
 * Create a middleware wrapper for API routes
 */
export function withAuth(
  handler: (request: NextRequest, session: any) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { session, errorResponse } = await requireAuth(request, options);

    if (errorResponse) {
      return errorResponse;
    }

    return handler(request, session);
  };
}

/**
 * Check if user is authenticated (for client-side use)
 */
export async function checkAuth(): Promise<{
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  user: any | null;
}> {
  const session = await getCurrentSession();

  if (!session) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      isModerator: false,
      user: null,
    };
  }

  const adminCheck = await isAdmin();
  const moderatorCheck = await isModeratorOrAdmin();

  return {
    isAuthenticated: true,
    isAdmin: adminCheck,
    isModerator: moderatorCheck,
    user: {
      id: session.userId,
      username: session.username,
      email: session.email,
      role: session.role,
    },
  };
}
