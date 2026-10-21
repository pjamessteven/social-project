/**
 * Section-level search over the wiki (`pages` table) for the chat agent's
 * searchTopics / readTopic tools.
 *
 * Pages average ~35 KB of markdown, so the agent never gets whole pages: each
 * page is split at its "##"/"###" headings and the best-matching sections are
 * returned with a short excerpt and a deep link (page URL + heading anchor,
 * computed the same way the public page renders heading ids).
 *
 * Search is lexical (query terms against section/heading/title tokens) and
 * runs in memory over the cached page snapshot — the wiki is small and
 * changes rarely, so no separate index to keep in sync.
 */
import { defaultLocale } from "@/i18n/routing";
import {
  buildLocalizedPath,
  buildPublicPath,
  getAllPagesWithSlugs,
  getLocalizedValue,
  normalizeSegment,
  type PageWithSlugs,
} from "./pages";

export interface TopicSection {
  /** Plain-text heading, or null for the intro before the first heading. */
  heading: string | null;
  /** Heading id on the rendered page (null for the intro). */
  anchor: string | null;
  /** 2 for "##", 3 for "###", 0 for the intro. */
  level: number;
  /** Section markdown (without the heading line). */
  raw: string;
  /** Section text with markup stripped, for matching and excerpts. */
  text: string;
}

export interface TopicSectionHit {
  path: string;
  title: string;
  summary: string | null;
  heading: string | null;
  anchor: string | null;
  /** Public URL path, e.g. "/fr/topics/hormones/testosterone#effets". */
  url: string;
  excerpt: string;
  score: number;
  isStub: boolean;
  published: boolean;
}

export interface TopicRead {
  path: string;
  title: string;
  summary: string | null;
  url: string;
  isStub: boolean;
  published: boolean;
  /** Table of contents of the page (in the locale that was read). */
  sections: Array<{ heading: string; anchor: string; level: number }>;
  /** The requested section (with its subsections), when `section` matched. */
  section?: { heading: string; anchor: string; url: string; content: string };
  /** Page content from the top, when no section was requested. */
  content?: string;
  truncated: boolean;
}

const STOPWORDS = new Set(
  (
    "a an and are as at be been being but by can could did do does for from " +
    "had has have he her his how i if in into is it its me my no not of on " +
    "or our out she so some than that the their them then there these they " +
    "this those to up us very was we were what when where which while who " +
    "whom why will with would you your also about more most any all one"
  ).split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 2);
}

function queryTerms(query: string): string[] {
  const terms = tokenize(query).filter((t) => !STOPWORDS.has(t));
  // A query made only of stopwords still has to match something.
  return [...new Set(terms.length ? terms : tokenize(query))];
}

/** Markdown/HTML → plain text (good enough for matching and excerpts). */
export function stripMarkup(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[ \t]*>+[ \t]?/gm, "")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/[*_`~]+/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Mirrors slugifyHeading in app/lib/markdown.ts so anchors match the page. */
function headingAnchor(text: string, seen: Map<string, number>): string {
  const base = normalizeSegment(text).slice(0, 80) || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

const MD_HEADING = /^(#{2,3})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
const HTML_HEADING = /^[ \t]*<h([23])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>[ \t]*$/i;

/**
 * Split page markdown into sections at "##"/"###" (or <h2>/<h3>) headings.
 * Anchor ids follow the renderer's rules, including "-2" suffixes for
 * duplicate headings.
 */
export function splitSections(content: string): TopicSection[] {
  const seen = new Map<string, number>();
  const out: Array<{
    heading: string | null;
    anchor: string | null;
    level: number;
    lines: string[];
  }> = [];
  let current = {
    heading: null,
    anchor: null,
    level: 0,
    lines: [],
  } as (typeof out)[number];
  let inFence = false;

  for (const line of content.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const md = inFence ? null : MD_HEADING.exec(line);
    const html = inFence || md ? null : HTML_HEADING.exec(line);
    if (md || html) {
      out.push(current);
      const level = md ? md[1].length : Number(html![1]);
      const heading = stripMarkup(md ? md[2] : html![2]);
      current = {
        heading: heading || "Section",
        anchor: headingAnchor(heading, seen),
        level,
        lines: [],
      };
      continue;
    }
    current.lines.push(line);
  }
  out.push(current);

  return out
    .map((section) => {
      const raw = section.lines.join("\n").trim();
      return {
        heading: section.heading,
        anchor: section.anchor,
        level: section.level,
        raw,
        text: stripMarkup(raw),
      };
    })
    .filter((section) => section.heading !== null || section.text.length > 0);
}

// ---------------------------------------------------------------------------
// Per-page section cache (keyed by page id + locale + updatedAt)
// ---------------------------------------------------------------------------

interface IndexedSection extends TopicSection {
  index: number;
  tokenCounts: Map<string, number>;
  headingTokens: Set<string>;
}

interface IndexedPage {
  key: string;
  title: string;
  summary: string | null;
  titleTokens: Set<string>;
  sections: IndexedSection[];
}

const pageIndexCache = new Map<string, IndexedPage>();
const PAGE_INDEX_CACHE_MAX = 2000;

function countTokens(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

function localizedContent(page: PageWithSlugs["page"], locale: string) {
  const content =
    locale === defaultLocale
      ? page.content
      : getLocalizedValue(page.contentTranslation, locale, null);
  const title =
    locale === defaultLocale
      ? page.title
      : (getLocalizedValue(page.titleTranslation, locale, page.title) ??
        page.title);
  const summary =
    locale === defaultLocale
      ? page.summary
      : getLocalizedValue(page.summaryTranslation, locale, page.summary);
  return { content, title, summary };
}

/** Indexed sections for one page in one locale; null when untranslated. */
function indexPage(item: PageWithSlugs, locale: string): IndexedPage | null {
  const { page } = item;
  const key = `${page.id}:${locale}:${page.updatedAt.getTime()}`;
  const cached = pageIndexCache.get(key);
  if (cached) return cached;

  const { content, title, summary } = localizedContent(page, locale);
  if (!content) return null;

  const indexed: IndexedPage = {
    key,
    title,
    summary,
    titleTokens: new Set(tokenize(title)),
    sections: splitSections(content).map((section, index) => ({
      ...section,
      index,
      tokenCounts: countTokens(tokenize(section.text)),
      headingTokens: new Set(section.heading ? tokenize(section.heading) : []),
    })),
  };

  if (pageIndexCache.size >= PAGE_INDEX_CACHE_MAX) pageIndexCache.clear();
  pageIndexCache.set(key, indexed);
  return indexed;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const MAX_TERM_HITS = 5;
const HEADING_BONUS = 4;
const TITLE_BONUS = 2;
const PHRASE_BONUS = 10;
const EXCERPT_LENGTH = 360;
const MAX_HITS_PER_PAGE = 2;

function scoreSection(
  section: IndexedSection,
  page: IndexedPage,
  terms: string[],
  phrase: string,
): number {
  let score = 0;
  let matched = 0;
  for (const term of terms) {
    const inBody = Math.min(section.tokenCounts.get(term) ?? 0, MAX_TERM_HITS);
    const inHeading = section.headingTokens.has(term) ? HEADING_BONUS : 0;
    const inTitle = page.titleTokens.has(term) ? TITLE_BONUS : 0;
    const termScore = inBody + inHeading + inTitle;
    if (termScore > 0) matched++;
    score += termScore;
  }
  if (matched === 0) return 0;
  if (terms.length > 1 && section.text.toLowerCase().includes(phrase)) {
    score += PHRASE_BONUS;
  }
  // Reward covering more of the query over repeating one term.
  return score * (matched / terms.length);
}

function excerptFor(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  let position = -1;
  for (const term of terms) {
    const found = lower.indexOf(term);
    if (found >= 0 && (position < 0 || found < position)) position = found;
  }
  if (text.length <= EXCERPT_LENGTH) return text;
  const start = Math.max(0, (position < 0 ? 0 : position) - EXCERPT_LENGTH / 3);
  const from = start === 0 ? 0 : text.lastIndexOf(" ", start) + 1;
  let to = Math.min(text.length, from + EXCERPT_LENGTH);
  if (to < text.length) to = text.lastIndexOf(" ", to);
  if (to <= from) to = Math.min(text.length, from + EXCERPT_LENGTH);
  return `${from > 0 ? "…" : ""}${text.slice(from, to).trim()}${
    to < text.length ? "…" : ""
  }`;
}

export interface SearchTopicsOptions {
  query: string;
  locale?: string;
  limit?: number;
  includeDrafts?: boolean;
}

/**
 * Rank wiki sections for a query. The default-locale (English) text is always
 * searched; when the user's locale has a translation it is searched too and
 * the result links to the translated section. Hits on the English version of
 * a translated page link to the translated page's matching section (same
 * position) when the structures line up, else to the page itself.
 */
export async function searchTopicSections(
  options: SearchTopicsOptions,
): Promise<{
  hits: TopicSectionHit[];
  terms: string[];
  pagesSearched: number;
}> {
  const locale = options.locale ?? defaultLocale;
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 20);
  const terms = queryTerms(options.query);
  const phrase = tokenize(options.query).join(" ");
  if (terms.length === 0) return { hits: [], terms, pagesSearched: 0 };

  const all = await getAllPagesWithSlugs();
  const items = options.includeDrafts
    ? all
    : all.filter((item) => item.page.published);
  const byId = new Map(items.map((item) => [item.page.id, item]));

  const hits: TopicSectionHit[] = [];
  for (const item of items) {
    const english = indexPage(item, defaultLocale);
    if (!english) continue;
    const translated =
      locale !== defaultLocale ? indexPage(item, locale) : null;
    const sameShape =
      !!translated && translated.sections.length === english.sections.length;
    const pageUrl = buildPublicPath(item, byId, locale);

    // Best score per section position across the two languages.
    const best = new Map<
      number,
      {
        score: number;
        section: IndexedSection;
        page: IndexedPage;
        anchor: string | null;
      }
    >();
    const consider = (page: IndexedPage, fromTranslation: boolean) => {
      for (const section of page.sections) {
        const score = scoreSection(section, page, terms, phrase);
        if (score <= 0) continue;
        const anchor = fromTranslation
          ? section.anchor
          : translated
            ? sameShape
              ? translated.sections[section.index].anchor
              : null
            : section.anchor;
        const existing = best.get(section.index);
        if (!existing || existing.score < score) {
          best.set(section.index, { score, section, page, anchor });
        }
      }
    };
    consider(english, false);
    if (translated) consider(translated, true);

    // Title/summary are translated far more often than content; show them in
    // the user's language even when the matched text is English.
    const display = localizedContent(item.page, locale);
    [...best.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HITS_PER_PAGE)
      .forEach(({ score, section, anchor }) => {
        hits.push({
          path: item.page.path,
          title: display.title,
          summary: display.summary,
          heading: section.heading,
          anchor,
          url: anchor ? `${pageUrl}#${anchor}` : pageUrl,
          excerpt: excerptFor(section.text, terms),
          score: Math.round(score * 100) / 100,
          isStub: item.page.isStub,
          published: item.page.published,
        });
      });
  }

  hits.sort((a, b) => b.score - a.score);
  return { hits: hits.slice(0, limit), terms, pagesSearched: items.length };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export interface ReadTopicOptions {
  path: string;
  section?: string;
  locale?: string;
  includeDrafts?: boolean;
  maxChars?: number;
}

function truncate(
  text: string,
  max: number,
): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  const cut = text.lastIndexOf("\n", max);
  return {
    text: `${text.slice(0, cut > max / 2 ? cut : max)}\n…`,
    truncated: true,
  };
}

/**
 * Read one wiki page (or one of its sections, with subsections) in the
 * caller's locale, falling back to English when untranslated. Returns null
 * when the page doesn't exist or isn't visible to the caller.
 */
export async function readTopic(
  options: ReadTopicOptions,
): Promise<
  TopicRead | { error: string; sections?: TopicRead["sections"] } | null
> {
  const locale = options.locale ?? defaultLocale;
  const maxChars = Math.min(Math.max(options.maxChars ?? 8000, 500), 30_000);
  // Accept "a/b", "/topics/a/b" and any locale's "/xx/topics/<translated>".
  const wanted = options.path
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^(?:[a-z]{2}(?:-[a-z]{2})?\/)?topics\//i, "")
    .replace(/#.*$/, "");

  const all = await getAllPagesWithSlugs();
  const items = options.includeDrafts
    ? all
    : all.filter((item) => item.page.published);
  const byId = new Map(items.map((item) => [item.page.id, item]));
  const item =
    items.find((candidate) => candidate.page.path === wanted) ??
    items.find((candidate) =>
      [locale, ...Object.keys(candidate.slugs)].some(
        (candidateLocale) =>
          buildLocalizedPath(candidate, byId, candidateLocale) === wanted,
      ),
    );
  if (!item) return null;

  const indexed =
    (locale !== defaultLocale ? indexPage(item, locale) : null) ??
    indexPage(item, defaultLocale);
  if (!indexed) return null;
  const display = localizedContent(item.page, locale);

  const pageUrl = buildPublicPath(item, byId, locale);
  const toc = indexed.sections
    .filter((section) => section.heading && section.anchor)
    .map((section) => ({
      heading: section.heading!,
      anchor: section.anchor!,
      level: section.level,
    }));
  const base = {
    path: item.page.path,
    title: display.title,
    summary: display.summary,
    url: pageUrl,
    isStub: item.page.isStub,
    published: item.page.published,
    sections: toc,
  };

  if (options.section) {
    const needle = options.section.trim().replace(/^#/, "").toLowerCase();
    const start = indexed.sections.findIndex(
      (section) =>
        section.anchor === needle ||
        section.anchor === normalizeSegment(needle) ||
        (section.heading ?? "").toLowerCase() === needle ||
        (section.heading ?? "").toLowerCase().includes(needle),
    );
    if (start < 0) {
      return {
        error: `No section matching "${options.section}" on ${item.page.path}. Available sections are listed.`,
        sections: toc,
      };
    }
    const head = indexed.sections[start];
    const parts: string[] = [head.raw];
    for (let i = start + 1; i < indexed.sections.length; i++) {
      const next = indexed.sections[i];
      if (next.level <= head.level) break;
      parts.push(`${"#".repeat(next.level)} ${next.heading}\n\n${next.raw}`);
    }
    const { text, truncated } = truncate(parts.join("\n\n"), maxChars);
    return {
      ...base,
      section: {
        heading: head.heading ?? "",
        anchor: head.anchor ?? "",
        url: head.anchor ? `${pageUrl}#${head.anchor}` : pageUrl,
        content: text,
      },
      truncated,
    };
  }

  const full = indexed.sections
    .map((section) =>
      section.heading
        ? `${"#".repeat(section.level)} ${section.heading}\n\n${section.raw}`
        : section.raw,
    )
    .join("\n\n");
  const { text, truncated } = truncate(full, maxChars);
  return { ...base, content: text, truncated };
}
