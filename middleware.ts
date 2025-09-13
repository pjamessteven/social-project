// middleware.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  /*
  const ip = getIP(req);

  const slug =
    req.nextUrl.hostname === "detrans.ai"
      ? "detrans:general-req"
      : "affirm:general-req";

  // 100 page loads per day allowed
  const { allowed, remaining } = await rateLimiter(ip, slug, 200);
  // limit is for fresh LLM content which is controlled by CachedLLM in workflow
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Limit", "10");
  */
  res.headers.set("x-pathname", req.nextUrl.pathname);

  return res;
}

export const config = {
  // run on every page request, skip static/_next/api routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
