import { marked } from "marked";
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

export function renderWikiMarkdown(markdown: string): {
  html: string;
  toc: WikiTocItem[];
} {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
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
      a: (tagName: string, attribs: Record<string, string>) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer" },
      }),
      // Callouts: enforce compact, small-text styling regardless of what the
      // authoring model writes (support-page look, reduced vertical padding).
      div: (tagName: string, attribs: Record<string, string>) =>
        attribs.class?.includes("bg-muted/30")
          ? {
              tagName,
              attribs: {
                ...attribs,
                class: "bg-muted/30 my-4 rounded-lg border px-4 py-2 text-sm",
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
