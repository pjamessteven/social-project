import {
  getSitemapBaseUrl,
  getSitemapRoutes,
  renderUrlset,
  SITEMAP_CHUNK_SIZE,
} from "@/app/sitemap.xml/build";
import { NextRequest } from "next/server";

/** One chunk of the sitemap (`/sitemaps/{n}.xml`, 1-based) listed by the index. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const match = /^([1-9]\d*)\.xml$/.exec((await params).file);
  if (!match) return new Response("Not found", { status: 404 });

  const routes = await getSitemapRoutes(getSitemapBaseUrl(request.headers));
  const start = (Number(match[1]) - 1) * SITEMAP_CHUNK_SIZE;
  if (start >= routes.length) return new Response("Not found", { status: 404 });

  return new Response(
    renderUrlset(routes.slice(start, start + SITEMAP_CHUNK_SIZE)),
    { headers: { "Content-Type": "application/xml" } },
  );
}
