// middleware.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLogger } from "./app/lib/logger";

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const isDev = process.env.NODE_ENV === "development";
  const host = req.headers.get("host");
  const ip = getIP(req);
  const logger = getLogger();
  const startTime = Date.now();

  // Log the request
  logger.info(
    {
      method: req.method,
      url: req.url,
      pathname,
      searchParams: Object.fromEntries(searchParams),
      host,
      ip,
      userAgent: req.headers.get("user-agent"),
      referer: req.headers.get("referer"),
      headers: {
        "content-type": req.headers.get("content-type"),
        accept: req.headers.get("accept"),
        authorization: req.headers.get("authorization") ? "[REDACTED]" : null,
      },
    },
    "Request received",
  );

  let res: NextResponse;

  try {
    res = NextResponse.next();

    const allowedHosts = ["detrans.ai"];

    if (host && !allowedHosts.includes(host) && !isDev) {
      const url = req.nextUrl.clone();
      url.hostname = "detrans.ai";
      url.protocol = "https";
      url.port = "";

      return NextResponse.redirect(url.toString(), 301);
    }

    res.headers.set("x-pathname", req.nextUrl.pathname);

    // Log the response
    logger.info(
      {
        method: req.method,
        pathname,
        status: res.status,
        duration: Date.now() - startTime,
        ip,
      },
      "Request completed",
    );

    return res;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log the error
    logger.error(
      {
        method: req.method,
        pathname,
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
        ip,
      },
      "Request failed",
    );

    // Re-throw the error to maintain normal error handling
    throw error;
  }
}

export const config = {
  // run on every page request, skip static/_next/api routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
