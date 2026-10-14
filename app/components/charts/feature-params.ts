type ReadonlyParams = { get(name: string): string | null };

/**
 * Shared stats filters, matching /api/features/* query params. Plain module
 * (no "use client") so the server page can build the same query strings the
 * charts will ask for.
 */
export function buildFeatureParams(params: ReadonlyParams): string {
  const query = new URLSearchParams();
  const minAge = params.get("minAge");
  const maxAge = params.get("maxAge");
  const sex = params.get("sex");
  const tag = params.get("tag");
  if (minAge) query.set("minAge", minAge);
  if (maxAge) query.set("maxAge", maxAge);
  if (sex) query.set("sex", sex);
  if (tag) query.set("tag", tag);
  return query.toString();
}

/**
 * Key for server-prefetched responses: endpoint path plus its query with the
 * params sorted, so the server and client agree regardless of param order.
 */
export function initialDataKey(path: string, query: string): string {
  const params = [...new URLSearchParams(query).entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `${path}?${new URLSearchParams(params)}`;
}
