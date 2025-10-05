// middleware.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLogger } from "./app/lib/logger";

function getIP(req: NextRequest): string {
  return (
    req.ip ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname, searchParams } = req.nextUrl;

  const isDev = process.env.NODE_ENV === "development";
  const host = req.headers.get("host");
  const ip = getIP(req);
  const logger = getLogger();

  // Log the request
  logger.info({
    method: req.method,
    url: req.url,
    pathname,
    searchParams: Object.fromEntries(searchParams),
    host,
    ip,
    userAgent: req.headers.get('user-agent'),
    referer: req.headers.get('referer'),
    headers: {
      'content-type': req.headers.get('content-type'),
      'accept': req.headers.get('accept'),
      'authorization': req.headers.get('authorization') ? '[REDACTED]' : null,
    }
  }, 'Request received');

  const allowedHosts = ["detrans.ai", "genderaffirming.ai"];

  if (host && !allowedHosts.includes(host) && !isDev) {
    const url = req.nextUrl.clone();
    url.hostname = "detrans.ai";
    url.protocol = "https";
    url.port = "";

    return NextResponse.redirect(url.toString(), 301);
  }

  if (host === "genderaffirming.ai") {
    // map the public path to the internal “/affirm/…” folder
    const rewriteMap: Record<string, string> = {
      "/": "/affirm",
      "/chat": "/affirm/chat",
      "/prompts": "/affirm/prompts",
      "/terms": "/affirm/terms",
      "/contact": "/affirm/contact",
    };

    const internal = rewriteMap[pathname];
    if (internal) {
      const url = req.nextUrl.clone();
      url.pathname = internal;
      return NextResponse.redirect(url);
    }
  }

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
