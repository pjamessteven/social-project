import { buildLocalizedPath, getPublishedPages } from "@/app/lib/pages";
import { SITE_URL } from "@/app/lib/seo";
import { NextRequest } from "next/server";

/**
 * llms.txt — a concise, LLM-friendly index of the site's wiki pages.
 */
export async function GET(_request: NextRequest) {
  const pages = await getPublishedPages();
  const byId = new Map(pages.map((entry) => [entry.page.id, entry]));

  const lines = [
    "# detrans.ai",
    "",
    "> detrans.ai documents detransition experiences and the evidence around gender medicine. This file lists the site's wiki pages.",
    "",
    "## Wiki pages",
    "",
  ];

  for (const entry of pages) {
    const url = `${SITE_URL}/en/topics/${buildLocalizedPath(entry, byId, "en")}`;
    const stub = entry.page.isStub ? " (stub)" : "";
    const summary = entry.page.summary ? `: ${entry.page.summary}` : "";
    lines.push(`- [${entry.page.title}](${url})${stub}${summary}`);
  }

  lines.push("", "## Sitemap", "", `- ${SITE_URL}/sitemap.xml`, "");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
