/**
 * Streaming guard against fabricated detransitioner quotes.
 *
 * The chat model is told to quote comments verbatim, but it sometimes invents
 * a quote (or recycles an example from its own instructions) and attributes
 * it to a real-looking user. This gate sits between the model's text deltas
 * and the response stream: it lets ordinary text through immediately, holds
 * back each markdown blockquote until the block is complete, and then checks
 * the quoted words against every comment the agent actually retrieved in the
 * conversation (tool results from this turn and earlier turns).
 *
 * - A blockquote that matches a retrieved comment is emitted unchanged, except
 *   that an attribution link pointing somewhere else is corrected to the
 *   matched comment's username and link.
 * - A blockquote attributed to a study or published source is passed through
 *   (studies are cited by id/URL, not by quoted text we hold).
 * - Any other blockquote that matches nothing is replaced with a short note.
 *
 * Matching is by word-trigram overlap after normalisation, so trimming with
 * "..." and light punctuation/case differences still verify, while invented
 * sentences do not.
 */
import type { UIMessage } from "ai";

export interface QuoteSource {
  text: string;
  username?: string;
  link?: string;
}

export interface QuoteDecision {
  quote: string;
  outcome: "verified" | "removed" | "passthrough" | "link-fixed";
  score: number;
  source?: QuoteSource;
}

const MIN_FRAGMENT_WORDS = 4;
const MATCH_THRESHOLD = 0.6;
const REMOVED_NOTE =
  "> *[An unverified quote was removed here: it did not match any comment retrieved in this conversation.]*";

const QUOTE_LINE = /^[ \t]*>/;
const PARTIAL_NON_QUOTE = /^[ \t]*[^ \t>\n]/;
const ELLIPSIS = /\.{3,}|…|\[\s*(?:\.{3}|…)\s*\]/g;

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .split(/[^\p{L}\p{N}']+/u)
    .map((word) => word.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

function trigrams(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 2 < words.length; i++) {
    out.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return out;
}

/** Strip blockquote markers and emphasis from the quoted lines. */
function quotedText(lines: string[]): string {
  return lines
    .map((line) => line.replace(/^[ \t]*>+[ \t]?/, ""))
    .join("\n")
    .replace(/[*_]{1,3}/g, "")
    .replace(/^["“„]|["”]$/g, "")
    .trim();
}

function isAttributionLine(line: string): boolean {
  const body = line.replace(/^[ \t]*>+[ \t]?/, "").trim();
  return (
    /^[—–-]{1,2}\s*\(?\[/.test(body) ||
    (/^[—–-]{1,2}\s*\S/.test(body) && /\]\(|detrans|desist/i.test(body)) ||
    /\]\(https?:\/\/[^)]*reddit\.com/i.test(body)
  );
}

/** Study/published-source attribution: not ours to verify. */
function isPublishedSource(attribution: string): boolean {
  return (
    /\/studies\//.test(attribution) ||
    /\bet al\b/i.test(attribution) ||
    /\]\(https?:\/\/(?!(?:www\.|old\.)?reddit\.com)/i.test(attribution)
  );
}

export class QuoteGate {
  private sources: Array<QuoteSource & { grams: Set<string> }> = [];
  private seenTexts = new Set<string>();
  private buffer = "";
  private quoteLines: string[] = [];
  private inQuote = false;
  private atLineStart = true;
  readonly decisions: QuoteDecision[] = [];

  constructor(private readonly label = "quote-check") {}

  // --- Corpus --------------------------------------------------------------

  addSource(source: QuoteSource) {
    const words = normalizeWords(source.text);
    if (words.length < MIN_FRAGMENT_WORDS) return;
    const key = words.join(" ");
    if (this.seenTexts.has(key)) return;
    this.seenTexts.add(key);
    this.sources.push({ ...source, grams: new Set(trigrams(words)) });
  }

  /** Harvest every `{ text, ... }` object from a tool result (JSON or object). */
  addSources(raw: unknown) {
    let value = raw;
    if (typeof raw === "string") {
      try {
        value = JSON.parse(raw);
      } catch {
        return;
      }
    }
    const walk = (node: unknown, depth: number) => {
      if (!node || typeof node !== "object" || depth > 6) return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }
      const obj = node as Record<string, any>;
      if (typeof obj.text === "string") {
        const meta =
          obj.metadata && typeof obj.metadata === "object" ? obj.metadata : obj;
        this.addSource({
          text: obj.text,
          username:
            typeof meta.username === "string" ? meta.username : undefined,
          link: typeof meta.link === "string" ? meta.link : undefined,
        });
      }
      for (const [key, child] of Object.entries(obj)) {
        if (key === "metadata" || key === "text") continue;
        walk(child, depth + 1);
      }
    };
    walk(value, 0);
  }

  /** Harvest tool results persisted on earlier turns' data parts. */
  addFromMessages(messages: UIMessage[]) {
    for (const message of messages) {
      for (const part of (message.parts ?? []) as any[]) {
        if (typeof part?.type !== "string" || !part.type.startsWith("data-")) {
          continue;
        }
        const result = part.data?.result;
        if (result !== undefined) this.addSources(result);
      }
    }
  }

  get sourceCount(): number {
    return this.sources.length;
  }

  // --- Verification --------------------------------------------------------

  private match(quote: string): { score: number; source?: QuoteSource } {
    const fragments = quote
      .split(ELLIPSIS)
      .map(normalizeWords)
      .filter((words) => words.length >= MIN_FRAGMENT_WORDS);
    // Short fragments can't be meaningfully checked (and aren't worth faking).
    if (fragments.length === 0) {
      const words = normalizeWords(quote);
      if (words.length < MIN_FRAGMENT_WORDS) return { score: 1 };
      fragments.push(words);
    }
    const wanted = fragments.flatMap(trigrams);
    if (wanted.length === 0) return { score: 1 };

    let best: { score: number; source?: QuoteSource } = { score: 0 };
    for (const source of this.sources) {
      let hit = 0;
      for (const gram of wanted) if (source.grams.has(gram)) hit++;
      const score = hit / wanted.length;
      if (score > best.score) {
        const { grams: _grams, ...rest } = source;
        best = { score, source: rest };
      }
      if (score === 1) break;
    }
    return best;
  }

  /** Verify one complete blockquote and return what to emit for it. */
  private resolveQuote(lines: string[]): string {
    const original = lines.join("");
    const attributionLines = lines.filter(isAttributionLine);
    const bodyLines = lines.filter((line) => !isAttributionLine(line));
    const attribution = attributionLines.join("\n");
    const quote = quotedText(bodyLines);

    if (!quote) return original;
    if (attribution && isPublishedSource(attribution)) {
      this.decisions.push({ quote, outcome: "passthrough", score: 1 });
      return original;
    }

    const { score, source } = this.match(quote);
    if (score >= MATCH_THRESHOLD) {
      // Fix a link that points at a different comment than the words came from.
      const linkMatch =
        /\[([^\]]*)\]\((https?:\/\/[^)\s]*reddit\.com[^)\s]*)\)/i.exec(
          attribution,
        );
      if (
        source?.link &&
        linkMatch &&
        linkMatch[2].replace(/\/+$/, "") !== source.link.replace(/\/+$/, "")
      ) {
        const replacement = `[${source.username ?? linkMatch[1]}](${source.link})`;
        this.decisions.push({ quote, outcome: "link-fixed", score, source });
        console.warn(
          `[${this.label}] corrected attribution ${linkMatch[0]} -> ${replacement}`,
        );
        return original.replace(linkMatch[0], replacement);
      }
      this.decisions.push({ quote, outcome: "verified", score, source });
      return original;
    }

    this.decisions.push({ quote, outcome: "removed", score, source });
    console.warn(
      `[${this.label}] removed unverified quote (best match ${Math.round(
        score * 100,
      )}% of ${this.sources.length} sources): ${JSON.stringify(quote.slice(0, 200))}`,
    );
    const trailingNewline = original.endsWith("\n") ? "\n" : "";
    return `${REMOVED_NOTE}${trailingNewline}`;
  }

  // --- Streaming -----------------------------------------------------------

  private finishQuote(): string {
    this.inQuote = false;
    const lines = this.quoteLines;
    this.quoteLines = [];
    // Blank lines after the quote belong to the surrounding text.
    let end = lines.length;
    while (end > 0 && !lines[end - 1].trim()) end--;
    const body = lines.slice(0, end);
    const trailing = lines.slice(end).join("");
    if (body.length === 0) return trailing;
    return this.resolveQuote(body) + trailing;
  }

  /** Feed a model delta; returns the text that is safe to emit now. */
  push(delta: string): string {
    this.buffer += delta;
    let out = "";

    for (;;) {
      if (this.inQuote) {
        const newline = this.buffer.indexOf("\n");
        if (newline < 0) {
          if (PARTIAL_NON_QUOTE.test(this.buffer)) {
            out += this.finishQuote();
            continue;
          }
          break; // need the rest of the line
        }
        const line = this.buffer.slice(0, newline + 1);
        if (QUOTE_LINE.test(line) || !line.trim()) {
          this.quoteLines.push(line);
          this.buffer = this.buffer.slice(newline + 1);
          continue;
        }
        out += this.finishQuote();
        continue; // the non-quote line is handled below
      }

      if (this.buffer.length === 0) break;

      if (this.atLineStart) {
        const indent = /^[ \t]*/.exec(this.buffer)![0].length;
        const first = this.buffer[indent];
        if (first === undefined) break; // only indentation so far
        if (first === ">") {
          this.inQuote = true;
          continue;
        }
      }

      const newline = this.buffer.indexOf("\n");
      if (newline < 0) {
        out += this.buffer;
        this.buffer = "";
        this.atLineStart = false;
        break;
      }
      out += this.buffer.slice(0, newline + 1);
      this.buffer = this.buffer.slice(newline + 1);
      this.atLineStart = true;
    }

    return out;
  }

  /** End of a text segment: resolve any pending quote and drain the buffer. */
  flush(): string {
    let out = "";
    if (this.inQuote) {
      if (this.buffer) {
        this.quoteLines.push(this.buffer);
        this.buffer = "";
      }
      out += this.finishQuote();
    }
    out += this.buffer;
    this.buffer = "";
    this.atLineStart = out.endsWith("\n") || (out === "" && this.atLineStart);
    return out;
  }
}
