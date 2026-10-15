"use server";
import { buildAlternates, localizedUrl, ogLocale } from "@/app/lib/seo";
import { GET as getHighlights } from "@/app/api/features/highlights/route";
import { GET as getSummary } from "@/app/api/features/summary/route";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NextRequest } from "next/server";
import StatsExperience from "../../components/charts/StatsExperience";
import {
  buildFeatureParams,
  initialDataKey,
} from "../../components/charts/feature-params";

/**
 * How long the page waits for a prefetch. Cached responses come back in
 * milliseconds; a cold filter combination can take minutes, and then it's
 * better to render now and let the chart fetch on the client (the
 * computation carries on and fills the cache either way).
 */
const PREFETCH_TIMEOUT_MS = 3000;

/**
 * Runs a feature API route in-process (sharing its Redis cache with the
 * client's requests) and returns its JSON, or null on failure or timeout so
 * the chart just falls back to fetching it on the client.
 */
async function prefetch(
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  query: string,
): Promise<unknown> {
  const url = new URL(`${path}?${query}`, "http://localhost");
  const json = handler(new NextRequest(url))
    .then((response) => (response.ok ? response.json() : null))
    .catch((error: unknown) => {
      console.error(`Stats prefetch failed for ${path}:`, error);
      return null;
    });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), PREFETCH_TIMEOUT_MS);
  });
  return Promise.race([json, timeout]).finally(() => clearTimeout(timer));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "statsPage" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    openGraph: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      url: localizedUrl("/stats", locale),
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: ogLocale(locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadata.title"),
      description: t("metadata.description"),
    },
    alternates: buildAlternates("/stats", locale),
  };
}

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    minAge?: string;
    maxAge?: string;
    sex?: string;
    tag?: string;
  }>;
}) {
  const raw = await searchParams;
  const query = buildFeatureParams({
    get: (name) => raw[name as keyof typeof raw] ?? null,
  });

  // Everything visible on first paint (the highlights ribbon and the open
  // overview section) is fetched here, so the page renders complete in one
  // go instead of popping in and shifting after hydration, and crawlers get
  // the numbers in the HTML.
  const [highlights, summary] = await Promise.all([
    prefetch(getHighlights, "/api/features/highlights", query),
    prefetch(getSummary, "/api/features/summary", query),
  ]);
  const initialData: Record<string, unknown> = {};
  if (highlights)
    initialData[initialDataKey("/api/features/highlights", query)] = highlights;
  if (summary)
    initialData[initialDataKey("/api/features/summary", query)] = summary;
  const initialHighlights =
    ((highlights as { highlights?: unknown[] } | null)?.highlights?.length ??
      0) > 0;

  return (
    <div className="pb-16 lg:pt-8">
      <StatsExperience
        initialData={initialData}
        initialHighlights={initialHighlights}
      />
    </div>
  );
}
