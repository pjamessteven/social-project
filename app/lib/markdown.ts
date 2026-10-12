import { Marked, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";
import { normalizeSegment } from "./pages";

/**
 * Renders agent-authored wiki markdown to sanitized HTML and extracts a table
 * of contents from its h2/h3 headings (stable, deduped anchor IDs).
 *
 * Server-side only.
 */

export interface WikiTocItem {
  id: string;
  text: string;
  level: number;
}

// Support-page vocabulary: sections, tables, disclosure blocks (<details>),
// reference lists, callouts, and safe inline formatting.
const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "a",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "del",
  "mark",
  "small",
  "br",
  "hr",
  "blockquote",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "sup",
  "sub",
  "details",
  "summary",
  "div",
  "span",
  "figure",
  "figcaption",
  "img",
];

function slugifyHeading(text: string): string {
  return normalizeSegment(text).slice(0, 80) || "section";
}

/**
 * Adds ids to h2/h3 headings and collects them as TOC items.
 */
export function extractHeadings(html: string): {
  html: string;
  toc: WikiTocItem[];
} {
  const toc: WikiTocItem[] = [];
  const seen = new Map<string, number>();

  const processed = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, level: string, attrs: string, inner: string) => {
      const plainText = inner
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!plainText) return _match;

      const baseId = slugifyHeading(plainText);
      const count = seen.get(baseId) ?? 0;
      seen.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

      toc.push({ id, text: plainText, level: Number(level) });

      // Keep any pre-existing attributes except a stale id
      const cleanAttrs = attrs.replace(/\sid="[^"]*"/i, "");
      return `<h${level} id="${id}"${cleanAttrs}>${inner}</h${level}>`;
    },
  );

  return { html: processed, toc };
}

// CommonMark leaves markdown inside raw HTML blocks untouched, so a citation
// like `([Singh et al. 2021](/studies/39))` in a hand-written <table> cell
// would render as literal text. Render inline markdown in the text between
// tags (skipping <pre>/<code> contents); sanitization still runs afterwards.
const wikiMarked: Marked = new Marked({
  renderer: {
    html(token: Tokens.HTML | Tokens.Tag): string {
      if (!token.block) return token.text;
      let rawDepth = 0;
      return token.text
        .split(/(<[^>]*>)/)
        .map((part): string => {
          if (part.startsWith("<")) {
            const m = /^<(\/?)(pre|code)\b/i.exec(part);
            if (m) rawDepth = Math.max(0, rawDepth + (m[1] ? -1 : 1));
            return part;
          }
          if (rawDepth > 0 || !/[[*_`]/.test(part)) return part;
          return wikiMarked.parseInline(part, { async: false }) as string;
        })
        .join("");
    },
  },
});

/**
 * Drop the generic "Key point" heading the authoring model puts at the top of
 * callouts; the card styling already marks them. Meaningful callout headings
 * ("Not medical advice", ...) are kept.
 */
function stripKeyPointHeadings(html: string): string {
  return html.replace(
    /(<div\s+class="[^"]*bg-muted\/30[^"]*"[^>]*>)\s*<h4[^>]*>\s*Key points?\s*<\/h4>/gi,
    "$1",
  );
}

export function renderWikiMarkdown(
  markdown: string,
  options?: {
    /** Maps an internal (root-relative) href to its canonical form. */
    rewriteHref?: (href: string) => string;
  },
): {
  html: string;
  toc: WikiTocItem[];
} {
  const rawHtml = stripKeyPointHeadings(
    wikiMarked.parse(markdown, { async: false }) as string,
  );
  const { html: withHeadingIds, toc } = extractHeadings(rawHtml);

  const html = sanitizeHtml(withHeadingIds, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      h1: ["id"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      h5: ["id"],
      h6: ["id"],
      div: ["class"],
      span: ["class"],
      p: ["class"],
      section: ["class"],
      table: ["class"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      ol: ["start"],
      details: ["open"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      // Internal links are rewritten to their canonical URL (no redirect
      // hops for crawlers); only external links get rel attributes.
      a: (tagName: string, attribs: Record<string, string>) => {
        const href = attribs.href ?? "";
        if (href.startsWith("/") && !href.startsWith("//")) {
          const { rel: _rel, ...rest } = attribs;
          return {
            tagName,
            attribs: {
              ...rest,
              href: options?.rewriteHref?.(href) ?? href,
            },
          };
        }
        return {
          tagName,
          attribs: { ...attribs, rel: "noopener noreferrer" },
        };
      },
      // Callouts: enforce the card look (same surface as the videos/studies/
      // stats cards) regardless of what the authoring model writes. The
      // wiki-callout class lets the layout zero the prose text margins.
      div: (tagName: string, attribs: Record<string, string>) =>
        attribs.class?.includes("bg-muted/30")
          ? {
              tagName,
              attribs: {
                ...attribs,
                class:
                  "wiki-callout my-6 rounded-2xl border bg-white px-5 py-4 italic text-muted-foreground shadow-sm dark:bg-secondary",
              },
            }
          : { tagName, attribs },
    },
    // Images must have alt text (accessibility + SEO)
    exclusiveFilter: (frame: {
      tag: string;
      attribs: Record<string, string>;
    }) => frame.tag === "img" && !frame.attribs.alt,
  });

  return { html, toc };
}
