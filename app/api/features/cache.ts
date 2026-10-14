import { connectRedis } from "@/app/lib/redis";
import { NextResponse, type NextRequest } from "next/server";
import { FEATURE_CACHE_HEADERS } from "./helpers";

/**
 * Server-side response cache for the feature stats endpoints.
 *
 * Every endpoint aggregates the whole cohort, which costs seconds of CPU per
 * query on the production box, and the stats page fires ~18 of them at once.
 * Without a cache each visitor (and crawler) re-runs all of them and the
 * requests pile up until they time out. The data only changes when a
 * processing run is imported, so responses are cached in Redis per
 * (path, query string):
 *
 *   - fresh for FRESH_SECONDS, then served stale while one background
 *     refresh recomputes it;
 *   - concurrent misses for the same key share one computation.
 *
 * Bump CACHE_VERSION (or `redis-cli --scan --pattern 'features:*' | xargs
 * redis-cli del`) to drop everything after an import.
 */
const CACHE_VERSION = 3;
const PREFIX = `features:v${CACHE_VERSION}:`;
const FRESH_SECONDS = 6 * 60 * 60;
const KEEP_SECONDS = 7 * 24 * 60 * 60;

interface CachedEntry {
  body: string;
  at: number;
}

/** In-flight computations, so concurrent misses share one query. */
const inflight = new Map<string, Promise<string | null>>();

function cacheKey(request: NextRequest): string {
  const url = new URL(request.url);
  const params = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `${PREFIX}${url.pathname}?${new URLSearchParams(params)}`;
}

function jsonResponse(body: string, cache: "HIT" | "STALE" | "MISS") {
  return new NextResponse(body, {
    headers: {
      ...FEATURE_CACHE_HEADERS,
      "Content-Type": "application/json",
      "X-Feature-Cache": cache,
    },
  });
}

export function withFeatureCache<Args extends unknown[]>(
  handler: (request: NextRequest, ...args: Args) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: Args): Promise<Response> => {
    const key = cacheKey(request);
    const redis = await connectRedis();

    // Runs the handler once per key at a time and stores successful bodies.
    // Resolves to null when the handler fails, so callers fall back to its
    // own error response.
    let failure: Response | null = null;
    const compute = () => {
      const pending = inflight.get(key);
      if (pending) return pending;
      const promise = (async () => {
        const response = await handler(request, ...args);
        if (!response.ok) {
          failure = response;
          return null;
        }
        const body = await response.text();
        if (redis) {
          const entry: CachedEntry = { body, at: Date.now() };
          await redis
            .set(key, JSON.stringify(entry), { EX: KEEP_SECONDS })
            .catch((error) => console.error("Feature cache set error:", error));
        }
        return body;
      })().finally(() => inflight.delete(key));
      inflight.set(key, promise);
      return promise;
    };

    let cached: CachedEntry | null = null;
    if (redis) {
      try {
        const raw = await redis.get(key);
        if (raw) cached = JSON.parse(raw) as CachedEntry;
      } catch (error) {
        console.error("Feature cache get error:", error);
      }
    }

    if (cached) {
      if (Date.now() - cached.at < FRESH_SECONDS * 1000) {
        return jsonResponse(cached.body, "HIT");
      }
      // Serve stale now; refresh in the background.
      compute().catch((error) =>
        console.error("Feature cache refresh error:", error),
      );
      return jsonResponse(cached.body, "STALE");
    }

    const body = await compute();
    if (body === null) {
      return (
        failure ??
        NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
      );
    }
    return jsonResponse(body, "MISS");
  };
}
