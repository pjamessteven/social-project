import { NextRequest } from "next/server";
import {
  getSitemapBaseUrl,
  getSitemapRoutes,
  SITEMAP_CHUNK_SIZE,
} from "./build";

/** Sitemap index: one `/sitemaps/{n}.xml` per chunk of entries. */
export async function GET(request: NextRequest) {
  const baseUrl = getSitemapBaseUrl(request.headers);
  const routes = await getSitemapRoutes(baseUrl);
  const chunks = Math.max(1, Math.ceil(routes.length / SITEMAP_CHUNK_SIZE));
  const entries = Array.from(
    { length: chunks },
    (_, i) => `  <sitemap>
    <loc>${baseUrl}/sitemaps/${i + 1}.xml</loc>
  </sitemap>`,
  ).join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
