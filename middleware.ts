import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getLogger } from "./app/lib/logger";
import { detectBrowserLocale } from "./i18n/detect-locale";
import { locales, defaultLocale, routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

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

  try {
    // Handle host redirect for production
    const allowedHosts = ["detrans.ai"];
    if (host && !allowedHosts.includes(host) && !isDev) {
      const url = req.nextUrl.clone();
      url.hostname = "detrans.ai";
      url.protocol = "https";
      url.port = "";

      return NextResponse.redirect(url.toString(), 301);
    }

    // Check if pathname starts with a locale
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    // If no locale in pathname, detect from browser and redirect
    if (!pathnameHasLocale && pathname !== "/") {
      const acceptLanguage = req.headers.get("accept-language");
      const detectedLocale = detectBrowserLocale(
        acceptLanguage,
        locales,
        defaultLocale,
      );

      const url = req.nextUrl.clone();
      url.pathname = `/${detectedLocale}${pathname}`;

      logger.info(
        {
          detectedLocale,
          acceptLanguage,
          originalPath: pathname,
          newPath: url.pathname,
        },
        "Locale detection redirect",
      );

      return NextResponse.redirect(url.toString(), 302);
    }

    // Run next-intl middleware
    const response = intlMiddleware(req);

    // Add custom headers
    response.headers.set("x-pathname", pathname);

    // Log the response
    logger.info(
      {
        method: req.method,
        pathname,
        status: response.status,
        duration: Date.now() - startTime,
        ip,
      },
      "Request completed",
    );

    return response;
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

    throw error;
  }
}

export const config = {
  // Match all pathnames except for
  // - /api routes
  // - /_next (Next.js internals)
  // - /_vercel (Vercel internals)
  // - all root files inside /public (e.g. /favicon.ico)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
