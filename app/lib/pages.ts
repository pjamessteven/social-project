import { db } from "@/db";
import { pageSlugs, pages, type Page } from "@/db/schema";
import { locales } from "@/i18n/locales";
import { defaultLocale, pathnames } from "@/i18n/routing";
import { and, asc, eq, inArray, isNull, like, notLike, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

/**
 * Data layer for agent-managed wiki pages.
 *
 * Addressing is by default-locale `path` (e.g. "topicname/subtopic/page").
 * Per-locale translated slug *segments* live in `page_slugs`; full localized
 * paths are derived by walking the parent chain, so renames touch one row.
 *
 * Server-side only.
 */

export const MAX_PATH_DEPTH = 6;

export interface PageTranslationInput {
  slug?: string;
  title?: string;
  summary?: string;
  content?: string;
}

export interface CreatePageInput {
  path: string;
  title: string;
  summary: string;
  content: string;
  translations?: Record<string, PageTranslationInput>;
  publish?: boolean;
  stub?: boolean;
  createdBy?: string | null;
}

export interface UpdatePageInput {
  newPath?: string;
  title?: string;
  summary?: string;
  content?: string;
  translations?: Record<string, PageTranslationInput>;
  publish?: boolean;
  stub?: boolean;
  updatedBy?: string | null;
}

export interface PageWithSlugs {
  page: Page;
  /** locale -> translated slug segment */
  slugs: Record<string, string>;
}

export interface PageTreeNode {
  id: number;
  slug: string;
  path: string;
  title: string;
  summary: string | null;
  published: boolean;
  isStub: boolean;
  updatedAt: string;
  /** Default-locale URL path under /topics, e.g. "topicname/subtopic/page" */
  url: string;
  /** Translated paths for locales that have explicit slug translations */
  localizedPaths?: Record<string, string>;
  children: PageTreeNode[];
}

// ---------------------------------------------------------------------------
// Validation / normalization
// ---------------------------------------------------------------------------

const RESERVED_TOP_SEGMENTS: ReadonlySet<string> = buildReservedTopSegments();

function buildReservedTopSegments(): ReadonlySet<string> {
  // Explicit extras beyond the site's registered routes
  const reserved = new Set<string>([
    "api",
    "about",
    "login",
    "topic",
    "topics",
    "sitemap.xml",
    "robots.txt",
    "llms.txt",
    "favicon.ico",
    "_next",
    "icon",
    "apple-icon",
    "opengraph-image",
    "manifest.webmanifest",
    "manifest.json",
  ]);

  // Every first segment of the localized route table (covers translated names)
  for (const key of Object.keys(pathnames as Record<string, unknown>)) {
    const first = key.replace(/^\//, "").split("/")[0];
    if (first && !first.includes("[")) reserved.add(first.toLowerCase());
  }

  return reserved;
}

/**
 * Unicode-safe slug segment: keeps letters/numbers from any script + hyphens,
 * plus combining marks (Devanagari/Thai vowel signs and tone marks are \p{M};
 * dropping them garbles the word).
 */
export function normalizeSegment(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{M}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Normalizes and validates a page path ("topicname/subtopic/page"). */
export function normalizePagePath(input: string): string {
  const segments = input.split("/").map(normalizeSegment).filter(Boolean);

  if (!segments.length) {
    throw new Error("Page path must contain at least one segment");
  }
  if (segments.length > MAX_PATH_DEPTH) {
    throw new Error(
      `Page path is too deep (max ${MAX_PATH_DEPTH} segments): "${input}"`,
    );
  }
  if (RESERVED_TOP_SEGMENTS.has(segments[0])) {
    throw new Error(
      `"${segments[0]}" is reserved by an existing site route and cannot be used as the first page segment`,
    );
  }
  return segments.join("/");
}

function parseJsonRecord(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
}

function serializeJsonRecord(record: Record<string, string>): string | null {
  return Object.keys(record).length ? JSON.stringify(record) : null;
}

/** Locale value with default-locale fallback (matches getLocalizedField semantics). */
export function getLocalizedValue(
  translationsJson: string | null,
  locale: string,
  fallback: string | null,
): string | null {
  const record = parseJsonRecord(translationsJson);
  return record[locale] ?? fallback;
}

interface ParsedTranslations {
  slugTranslations: Record<string, string>;
  titleTranslations: Record<string, string>;
  summaryTranslations: Record<string, string>;
  contentTranslations: Record<string, string>;
}

function parseTranslations(
  translations?: Record<string, PageTranslationInput>,
): ParsedTranslations {
  const result: ParsedTranslations = {
    slugTranslations: {},
    titleTranslations: {},
    summaryTranslations: {},
    contentTranslations: {},
  };
  if (!translations) return result;

  for (const [locale, values] of Object.entries(translations)) {
    if (!locales.includes(locale)) continue; // ignore unknown locales
    if (!values) continue;
    if (values.slug !== undefined) {
      const slug = normalizeSegment(values.slug);
      if (slug) result.slugTranslations[locale] = slug;
    }
    if (values.title?.trim())
      result.titleTranslations[locale] = values.title.trim();
    if (values.summary?.trim())
      result.summaryTranslations[locale] = values.summary.trim();
    if (values.content?.trim())
      result.contentTranslations[locale] = values.content;
  }
  return result;
}

async function assertSiblingSlugsAvailable(args: {
  parentId: number | null;
  pageId: number | null;
  slug: string;
  slugTranslations: Record<string, string>;
}): Promise<void> {
  const siblings = await db
    .select()
    .from(pages)
    .where(
      args.parentId === null
        ? isNull(pages.parentId)
        : eq(pages.parentId, args.parentId),
    );

  const others = args.pageId
    ? siblings.filter((s) => s.id !== args.pageId)
    : siblings;
  if (!others.length) return;

  const siblingSlugRows = await db
    .select()
    .from(pageSlugs)
    .where(
      inArray(
        pageSlugs.pageId,
        others.map((s) => s.id),
      ),
    );

  // Every locale falls back to the default slug, so the default slug must be
  // free in all locales too.
  const taken = new Set<string>();
  for (const sibling of others) taken.add(sibling.slug);
  for (const row of siblingSlugRows) taken.add(row.slug);

  const collisions: string[] = [];
  if (taken.has(args.slug)) collisions.push(`default "${args.slug}"`);
  for (const [locale, slug] of Object.entries(args.slugTranslations)) {
    if (taken.has(slug)) collisions.push(`${locale} "${slug}"`);
  }

  if (collisions.length) {
    throw new Error(
      `Slug already used by a sibling page: ${collisions.join(", ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createPage(
  input: CreatePageInput,
): Promise<PageWithSlugs> {
  const title = input.title?.trim();
  const content = input.content ?? "";
  if (!title) throw new Error("Page title is required");
  if (!content.trim()) throw new Error("Page content is required");

  const path = normalizePagePath(input.path);
  const slug = path.split("/").pop() as string;

  const existing = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.path, path))
    .limit(1);
  if (existing.length) {
    throw new Error(
      `A page already exists at "${path}" — use updatePage to edit it`,
    );
  }

  const parentPath = path.includes("/")
    ? path.slice(0, path.lastIndexOf("/"))
    : null;
  const parent = parentPath
    ? (
        await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.path, parentPath))
          .limit(1)
      )[0]
    : undefined;

  const parsed = parseTranslations(input.translations);
  await assertSiblingSlugsAvailable({
    parentId: parent?.id ?? null,
    pageId: null,
    slug,
    slugTranslations: parsed.slugTranslations,
  });

  const result = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(pages)
      .values({
        slug,
        parentId: parent?.id ?? null,
        path,
        title,
        titleTranslation: serializeJsonRecord(parsed.titleTranslations),
        summary: input.summary?.trim() || null,
        summaryTranslation: serializeJsonRecord(parsed.summaryTranslations),
        content,
        contentTranslation: serializeJsonRecord(parsed.contentTranslations),
        published: input.publish ?? true,
        isStub: input.stub ?? false,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      })
      .returning();

    if (Object.keys(parsed.slugTranslations).length) {
      await tx.insert(pageSlugs).values(
        Object.entries(parsed.slugTranslations).map(([locale, slugValue]) => ({
          pageId: created.id,
          locale,
          slug: slugValue,
        })),
      );
    }

    // Adopt existing orphans that were created under this path before the
    // parent existed (e.g. "hormones/testosterone" before "hormones").
    await tx
      .update(pages)
      .set({ parentId: created.id })
      .where(
        and(
          isNull(pages.parentId),
          like(pages.path, `${path}/%`),
          notLike(pages.path, `${path}/%/%`),
        ),
      );

    return { page: created, slugs: parsed.slugTranslations };
  });
  invalidatePagesSnapshot();
  return result;
}

export async function updatePage(
  path: string,
  input: UpdatePageInput,
): Promise<PageWithSlugs> {
  const normalizedPath = normalizePagePath(path);
  const existing = (
    await db.select().from(pages).where(eq(pages.path, normalizedPath)).limit(1)
  )[0];
  if (!existing) throw new Error(`No page found at "${normalizedPath}"`);

  const parsed = parseTranslations(input.translations);

  let newPath = existing.path;
  let newSlug = existing.slug;
  let newParentId = existing.parentId;

  if (input.newPath !== undefined) {
    const candidate = normalizePagePath(input.newPath);
    if (candidate !== existing.path) {
      const conflict = await db
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.path, candidate))
        .limit(1);
      if (conflict.length) {
        throw new Error(`A page already exists at "${candidate}"`);
      }
      newPath = candidate;
      newSlug = candidate.split("/").pop() as string;
      const parentPath = candidate.includes("/")
        ? candidate.slice(0, candidate.lastIndexOf("/"))
        : null;
      const parent = parentPath
        ? (
            await db
              .select({ id: pages.id })
              .from(pages)
              .where(eq(pages.path, parentPath))
              .limit(1)
          )[0]
        : undefined;
      newParentId = parent?.id ?? null;
    }
  }

  const slugsChanged =
    newSlug !== existing.slug ||
    Object.keys(parsed.slugTranslations).length > 0;

  if (slugsChanged) {
    await assertSiblingSlugsAvailable({
      parentId: newParentId ?? null,
      pageId: existing.id,
      slug: newSlug,
      slugTranslations: parsed.slugTranslations,
    });
  }

  const mergedTitle = {
    ...parseJsonRecord(existing.titleTranslation),
    ...parsed.titleTranslations,
  };
  const mergedSummary = {
    ...parseJsonRecord(existing.summaryTranslation),
    ...parsed.summaryTranslations,
  };
  const mergedContent = {
    ...parseJsonRecord(existing.contentTranslation),
    ...parsed.contentTranslations,
  };

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(pages)
      .set({
        path: newPath,
        slug: newSlug,
        parentId: newParentId,
        title: input.title?.trim() ?? existing.title,
        titleTranslation: serializeJsonRecord(mergedTitle),
        summary:
          input.summary !== undefined
            ? input.summary.trim() || null
            : existing.summary,
        summaryTranslation: serializeJsonRecord(mergedSummary),
        content: input.content ?? existing.content,
        contentTranslation: serializeJsonRecord(mergedContent),
        published: input.publish ?? existing.published,
        isStub: input.stub ?? existing.isStub,
        updatedBy: input.updatedBy ?? existing.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, existing.id))
      .returning();

    // Sync translated slug segments (only for locales explicitly provided).
    // A blank/whitespace slug removes the translation for that locale.
    const slugLocales = input.translations
      ? Object.entries(input.translations)
          .filter(([, values]) => values && values.slug !== undefined)
          .map(([locale]) => locale)
          .filter((locale) => locales.includes(locale))
      : [];

    if (slugLocales.length) {
      const localesToRemove = slugLocales.filter(
        (locale) => !parsed.slugTranslations[locale],
      );
      if (localesToRemove.length) {
        await tx
          .delete(pageSlugs)
          .where(
            and(
              eq(pageSlugs.pageId, existing.id),
              inArray(pageSlugs.locale, localesToRemove),
            ),
          );
      }
      const upserts = slugLocales
        .filter((locale) => parsed.slugTranslations[locale])
        .map((locale) => ({
          pageId: existing.id,
          locale,
          slug: parsed.slugTranslations[locale],
        }));
      if (upserts.length) {
        await tx
          .insert(pageSlugs)
          .values(upserts)
          .onConflictDoUpdate({
            target: [pageSlugs.pageId, pageSlugs.locale],
            set: { slug: sql`excluded.slug` },
          });
      }
    }

    // Rebuild all descendant paths if this page moved (any depth)
    if (newPath !== existing.path) {
      const descendants = await tx
        .select({ id: pages.id, path: pages.path })
        .from(pages)
        .where(like(pages.path, `${existing.path}/%`));
      for (const child of descendants) {
        const childPath = `${newPath}${child.path.slice(existing.path.length)}`;
        await tx
          .update(pages)
          .set({ path: childPath, updatedAt: new Date() })
          .where(eq(pages.id, child.id));
      }
    }

    const slugRows = await tx
      .select()
      .from(pageSlugs)
      .where(eq(pageSlugs.pageId, existing.id));

    return {
      page: updated,
      slugs: Object.fromEntries(slugRows.map((row) => [row.locale, row.slug])),
    };
  });
  invalidatePagesSnapshot();
  return result;
}

export async function deletePage(path: string): Promise<void> {
  const normalizedPath = normalizePagePath(path);
  const existing = (
    await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.path, normalizedPath))
      .limit(1)
  )[0];
  if (!existing) throw new Error(`No page found at "${normalizedPath}"`);

  // page_slugs cascade; children survive with parent_id set to NULL (FK)
  await db.delete(pages).where(eq(pages.id, existing.id));
  invalidatePagesSnapshot();
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * In-process snapshot of every page + slugs. Routing, the hub tree, the
 * sitemap and the featured article all need the full set, and loading it per
 * call (content in every locale, several MB) multiplied by a crawler burst
 * ran the server out of memory. Concurrent callers share one in-flight load;
 * writes in this module invalidate it, and the TTL covers out-of-band edits
 * (scripts, other processes). Callers must treat the result as read-only.
 */
const PAGES_SNAPSHOT_TTL_MS = 60_000;
let pagesSnapshot: {
  promise: Promise<PageWithSlugs[]>;
  loadedAt: number;
} | null = null;

function invalidatePagesSnapshot(): void {
  pagesSnapshot = null;
}

export function getAllPagesWithSlugs(): Promise<PageWithSlugs[]> {
  const now = Date.now();
  if (pagesSnapshot && now - pagesSnapshot.loadedAt < PAGES_SNAPSHOT_TTL_MS) {
    return pagesSnapshot.promise;
  }
  const snapshot = { promise: loadAllPagesWithSlugs(), loadedAt: now };
  pagesSnapshot = snapshot;
  // Don't cache failures
  snapshot.promise.catch(() => {
    if (pagesSnapshot === snapshot) pagesSnapshot = null;
  });
  return snapshot.promise;
}

async function loadAllPagesWithSlugs(): Promise<PageWithSlugs[]> {
  const [pageRows, slugRows] = await Promise.all([
    db.select().from(pages).orderBy(asc(pages.path)),
    db.select().from(pageSlugs),
  ]);

  const slugMap = new Map<number, Record<string, string>>();
  for (const row of slugRows) {
    const existing = slugMap.get(row.pageId) ?? {};
    existing[row.locale] = row.slug;
    slugMap.set(row.pageId, existing);
  }

  return pageRows.map((page) => ({
    page,
    slugs: slugMap.get(page.id) ?? {},
  }));
}

export async function getPublishedPages(): Promise<PageWithSlugs[]> {
  const all = await getAllPagesWithSlugs();
  return all.filter((item) => item.page.published);
}

export async function getPageByPath(
  path: string,
): Promise<PageWithSlugs | null> {
  const normalized = normalizePagePath(path);
  const page = (
    await db.select().from(pages).where(eq(pages.path, normalized)).limit(1)
  )[0];
  if (!page) return null;

  const slugRows = await db
    .select()
    .from(pageSlugs)
    .where(eq(pageSlugs.pageId, page.id));

  return {
    page,
    slugs: Object.fromEntries(slugRows.map((row) => [row.locale, row.slug])),
  };
}

/** Parent by FK, or by path prefix when the parent was created later. */
function resolveLogicalParentId(
  page: Page,
  byPath: Map<string, Page>,
): number | null {
  if (page.parentId != null) return page.parentId;
  const idx = page.path.lastIndexOf("/");
  if (idx === -1) return null;
  return byPath.get(page.path.slice(0, idx))?.id ?? null;
}

/** Ancestors root-first (cycle-guarded). */
function getAncestors(
  page: Page,
  byId: Map<number, Page>,
  byPath: Map<string, Page>,
): Page[] {
  const chain: Page[] = [];
  const visited = new Set<number>([page.id]);
  let currentId = resolveLogicalParentId(page, byPath);
  while (currentId != null && !visited.has(currentId)) {
    const parent = byId.get(currentId);
    if (!parent) break;
    visited.add(parent.id);
    chain.unshift(parent);
    currentId = resolveLogicalParentId(parent, byPath);
  }
  return chain;
}

/** Localized slug segments for the page's full path chain.
 *
 * Segments derive from the materialized `path` (not the FK chain), so URLs
 * stay correct for orphans, unpublished parents, and pages created "path
 * as is" without parent rows. Each prefix that has a row contributes its
 * translated slug for the locale; otherwise the raw segment is used.
 */
export function getLocalizedSegments(
  item: PageWithSlugs,
  byId: Map<number, PageWithSlugs>,
  locale: string,
): string[] {
  const entryByPath = new Map<string, PageWithSlugs>();
  for (const entry of byId.values()) entryByPath.set(entry.page.path, entry);

  const segments = item.page.path.split("/");
  return segments.map((segment, index) => {
    const prefixPath = segments.slice(0, index + 1).join("/");
    const entry =
      entryByPath.get(prefixPath) ??
      (index === segments.length - 1 ? item : undefined);
    return entry?.slugs[locale] ?? entry?.page.slug ?? segment;
  });
}

/** Full localized path (no leading slash), e.g. "topicname/subtopic/page". */
export function buildLocalizedPath(
  item: PageWithSlugs,
  byId: Map<number, PageWithSlugs>,
  locale: string,
): string {
  return getLocalizedSegments(item, byId, locale).join("/");
}

/** Public URL path (without host), e.g. "/en/topics/topicname/subtopic". */
export function buildPublicPath(
  item: PageWithSlugs,
  byId: Map<number, PageWithSlugs>,
  locale: string,
): string {
  const localized = buildLocalizedPath(item, byId, locale);
  return `/${locale}/topics/${localized}`;
}

function toTreeNode(
  item: PageWithSlugs,
  childrenByParent: Map<number, PageWithSlugs[]>,
  visited: Set<number>,
  byId: Map<number, PageWithSlugs>,
): PageTreeNode {
  visited.add(item.page.id);
  const children = (childrenByParent.get(item.page.id) ?? [])
    .filter((child) => !visited.has(child.page.id))
    .map((child) => toTreeNode(child, childrenByParent, visited, byId));

  const translatedLocales = Object.keys(item.slugs);
  const localizedPaths = translatedLocales.length
    ? Object.fromEntries(
        translatedLocales.map((locale) => [
          locale,
          buildLocalizedPath(item, byId, locale),
        ]),
      )
    : undefined;

  return {
    id: item.page.id,
    slug: item.page.slug,
    path: item.page.path,
    title: item.page.title,
    summary: truncateSummary(item.page.summary),
    published: item.page.published,
    isStub: item.page.isStub,
    updatedAt: item.page.updatedAt.toISOString(),
    url: item.page.path,
    localizedPaths,
    children,
  };
}

/**
 * Nested page tree for the agent's listPages tool: children nest under their
 * logical parent (FK or path prefix), orphans surface at the top level.
 * Output is capped so a large wiki can't blow the model context.
 */
export async function listPagesTree(options?: {
  includeDrafts?: boolean;
  maxNodes?: number;
}): Promise<{ tree: PageTreeNode[]; total: number; truncated: boolean }> {
  const maxNodes = options?.maxNodes ?? 200;
  const all = await getAllPagesWithSlugs();
  const filtered = options?.includeDrafts
    ? all
    : all.filter((item) => item.page.published);

  const total = filtered.length;
  const limited = filtered.slice(0, maxNodes);
  const truncated = total > limited.length;

  const byPath = new Map(filtered.map((item) => [item.page.path, item.page]));
  const byId = new Map(filtered.map((item) => [item.page.id, item]));
  const included = new Set(limited.map((item) => item.page.id));

  const childrenByParent = new Map<number, PageWithSlugs[]>();
  const roots: PageWithSlugs[] = [];

  for (const item of limited) {
    const logicalParentId = resolveLogicalParentId(item.page, byPath);
    // Pages above the cap are still treated as a boundary (child becomes root)
    if (logicalParentId == null || !included.has(logicalParentId)) {
      roots.push(item);
    } else {
      const siblings = childrenByParent.get(logicalParentId) ?? [];
      siblings.push(item);
      childrenByParent.set(logicalParentId, siblings);
    }
  }

  const visited = new Set<number>();
  const tree = roots
    .filter((root) => !visited.has(root.page.id))
    .map((root) => toTreeNode(root, childrenByParent, visited, byId));

  return { tree, total, truncated };
}

/**
 * Resolve a request's URL segments against a locale's slugs (translated
 * segment or default fallback), requiring the whole chain to match one page.
 */
export async function resolvePageBySegments(
  segments: string[],
  locale: string,
  options?: { includeDrafts?: boolean },
): Promise<PageWithSlugs | null> {
  if (!segments?.length) return null;

  const all = await getAllPagesWithSlugs();
  const candidates = options?.includeDrafts
    ? all
    : all.filter((item) => item.page.published);
  if (!candidates.length) return null;

  const byId = new Map(candidates.map((item) => [item.page.id, item]));

  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const wanted = segments.map((segment) => normalizeSegment(decode(segment)));
  if (wanted.some((segment) => !segment)) return null;

  // Prefer exact default-path match, then localized match
  for (const item of candidates) {
    const localizedSegments = getLocalizedSegments(item, byId, locale).map(
      (segment) => normalizeSegment(segment),
    );
    if (
      localizedSegments.length === wanted.length &&
      localizedSegments.every((segment, index) => segment === wanted[index])
    ) {
      return item;
    }
  }

  return null;
}

/**
 * Fallback for URLs that don't resolve in the request locale, so the caller
 * can redirect to the canonical URL:
 *
 * 1. The full path in another locale's slugs (the language switcher keeps the
 *    current locale's segments, e.g. /fr/.../proces -> /de/...).
 * 2. A moved page or a link written without its parent segments: the unique
 *    page whose final segment matches the request's final segment in any
 *    locale (or the default slug).
 *
 * Ambiguous matches return null.
 */
export async function findPageByFinalSegment(
  segments: string[],
  locale: string,
  options?: { includeDrafts?: boolean },
): Promise<PageWithSlugs | null> {
  if (!segments?.length) return null;
  const wanted = segments.map((segment) => {
    try {
      return normalizeSegment(decodeURIComponent(segment));
    } catch {
      return normalizeSegment(segment);
    }
  });
  const last = wanted[wanted.length - 1];
  if (!last) return null;

  const all = await getAllPagesWithSlugs();
  const candidates = all.filter(
    (item) => options?.includeDrafts || item.page.published,
  );
  const byId = new Map(candidates.map((item) => [item.page.id, item]));

  const otherLocales = locales.filter((code) => code !== locale);
  const fullMatches = new Set<PageWithSlugs>();
  for (const item of candidates) {
    for (const code of otherLocales) {
      const localized = getLocalizedSegments(item, byId, code).map((segment) =>
        normalizeSegment(segment),
      );
      if (
        localized.length === wanted.length &&
        localized.every((segment, index) => segment === wanted[index])
      ) {
        fullMatches.add(item);
        break;
      }
    }
  }
  if (fullMatches.size === 1) return [...fullMatches][0];

  const matches = candidates.filter(
    (item) =>
      item.page.slug === last || Object.values(item.slugs).includes(last),
  );
  return matches.length === 1 ? matches[0] : null;
}

/** Locales that have an explicit translated slug for a page. */
export function getTranslatedLocales(item: PageWithSlugs): string[] {
  return Object.keys(item.slugs);
}

/**
 * Locales whose page body is actually written in that language: the default
 * (English) content plus every locale with a content translation. Other
 * locales serve the English body and canonicalize to the English URL.
 */
export function getContentLocales(page: Page): string[] {
  const translated = Object.keys(parseJsonRecord(page.contentTranslation));
  return [defaultLocale, ...translated.filter((l) => l !== defaultLocale)];
}

/** Ancestor chain (root-first) as full PageWithSlugs entries. */
export function getPageAncestors(
  item: PageWithSlugs,
  byId: Map<number, PageWithSlugs>,
): PageWithSlugs[] {
  const byPath = new Map<string, Page>();
  const pageById = new Map<number, Page>();
  for (const entry of byId.values()) {
    byPath.set(entry.page.path, entry.page);
    pageById.set(entry.page.id, entry.page);
  }
  return getAncestors(item.page, pageById, byPath)
    .map((page) => byId.get(page.id))
    .filter((entry): entry is PageWithSlugs => Boolean(entry));
}

/** Direct children (parent path == item's path), from the provided page set. */
export function getPageChildren(
  item: PageWithSlugs,
  all: PageWithSlugs[],
): PageWithSlugs[] {
  return all.filter(
    (candidate) =>
      candidate.page.id !== item.page.id &&
      parentPathOf(candidate.page.path) === item.page.path,
  );
}

/** Siblings sharing the same parent path (orphan-safe: path-based, not FK). */
export function getPageSiblings(
  item: PageWithSlugs,
  all: PageWithSlugs[],
): PageWithSlugs[] {
  const parentPath = parentPathOf(item.page.path);
  return all.filter(
    (candidate) =>
      candidate.page.id !== item.page.id &&
      parentPathOf(candidate.page.path) === parentPath,
  );
}

function parentPathOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

/** Whether any root-level page is published (gates the Topics nav link). */
export async function hasPublishedTopics(): Promise<boolean> {
  const rows = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.published, true), notLike(pages.path, "%/%")))
    .limit(1);
  return rows.length > 0;
}

const LIST_SUMMARY_LIMIT = 200;

function truncateSummary(summary: string | null): string | null {
  if (!summary) return null;
  return summary.length > LIST_SUMMARY_LIMIT
    ? `${summary.slice(0, LIST_SUMMARY_LIMIT - 1)}…`
    : summary;
}

export interface LocalizedTopicNode {
  path: string;
  /** Localized path under /topics (translated slug segments for `locale`) */
  localizedPath: string;
  title: string;
  summary: string | null;
  children: LocalizedTopicNode[];
}

/** Localized nested topic tree (published pages) for the /topics hub. */
export async function getLocalizedPageTree(
  locale: string,
): Promise<LocalizedTopicNode[]> {
  const all = await getAllPagesWithSlugs();
  const published = all.filter((entry) => entry.page.published);
  // Ancestor slugs come from all pages (drafts too), like the sitemap.
  const byId = new Map(all.map((entry) => [entry.page.id, entry]));

  const nodesByPath = new Map<string, LocalizedTopicNode>();
  for (const entry of published) {
    nodesByPath.set(entry.page.path, {
      path: entry.page.path,
      localizedPath: buildLocalizedPath(entry, byId, locale),
      title:
        getLocalizedValue(
          entry.page.titleTranslation,
          locale,
          entry.page.title,
        ) ?? entry.page.title,
      summary: getLocalizedValue(
        entry.page.summaryTranslation,
        locale,
        entry.page.summary,
      ),
      children: [],
    });
  }

  const roots: LocalizedTopicNode[] = [];
  for (const entry of published) {
    const node = nodesByPath.get(entry.page.path);
    if (!node) continue;
    const parent = nodesByPath.get(parentPathOf(entry.page.path));
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortTree = (nodes: LocalizedTopicNode[]) => {
    nodes.sort((a, b) => a.path.localeCompare(b.path));
    for (const node of nodes) sortTree(node.children);
  };
  sortTree(roots);

  return roots;
}

// ---------------------------------------------------------------------------
// Featured article
// ---------------------------------------------------------------------------

export interface FeaturedTopic {
  /** Localized path under /topics */
  localizedPath: string;
  title: string;
  summary: string | null;
}

/** Small seeded PRNG (mulberry32) so the shuffle is stable across requests. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function queryFeaturedTopic(
  locale: string,
  day: number,
): Promise<FeaturedTopic | null> {
  const all = await getAllPagesWithSlugs();
  const candidates = all
    .filter((entry) => entry.page.published && !entry.page.isStub)
    .sort((a, b) => a.page.id - b.page.id);
  if (candidates.length === 0) return null;

  // A fixed shuffle walked one step per day: every article gets featured
  // once before any repeats, in an order that doesn't track the hierarchy.
  const random = seededRandom(0x5eed);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const entry = candidates[day % candidates.length];
  const byId = new Map(all.map((item) => [item.page.id, item]));

  return {
    localizedPath: buildLocalizedPath(entry, byId, locale),
    title:
      getLocalizedValue(
        entry.page.titleTranslation,
        locale,
        entry.page.title,
      ) ?? entry.page.title,
    summary: getLocalizedValue(
      entry.page.summaryTranslation,
      locale,
      entry.page.summary,
    ),
  };
}

const cachedFeaturedTopic = unstable_cache(
  queryFeaturedTopic,
  ["featured-topic"],
  { revalidate: 3600 },
);

/** Today's featured wiki article (changes daily at UTC midnight). */
export function getFeaturedTopic(
  locale: string,
): Promise<FeaturedTopic | null> {
  const day = Math.floor(Date.now() / 86_400_000);
  return cachedFeaturedTopic(locale, day);
}

// ---------------------------------------------------------------------------
// View counts
// ---------------------------------------------------------------------------

/**
 * Increment a published page's view counter. Raw SQL increment so it never
 * touches `updated_at` (which drives "Last updated" and the sitemap lastmod).
 */
export async function recordPageView(pageId: number): Promise<boolean> {
  const rows = await db
    .update(pages)
    .set({ viewsCount: sql`${pages.viewsCount} + 1` })
    .where(and(eq(pages.id, pageId), eq(pages.published, true)))
    .returning({ id: pages.id });
  return rows.length > 0;
}
