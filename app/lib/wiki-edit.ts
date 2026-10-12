/**
 * Pure line-based "unix" editing primitives over wiki markdown content.
 * Backs the agent's grep/cat/sed/patch tools. No DB access — content in,
 * content + CLI-style output out.
 */

export interface EditResult {
  ok: boolean;
  content: string;
  changed: number;
  output: string;
  error?: string;
}

export interface GrepMatch {
  line: number;
  text: string;
}

const LINE_TRUNCATE = 160;

function truncateLine(text: string): string {
  return text.length > LINE_TRUNCATE
    ? `${text.slice(0, LINE_TRUNCATE - 1)}…`
    : text;
}

// ---------------------------------------------------------------------------
// cat
// ---------------------------------------------------------------------------

function parseRange(
  range: string | undefined,
  lineCount: number,
): { start: number; end: number } | null {
  if (!range) return { start: 1, end: lineCount };
  const match = /^(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return null;
  const start = match[1] ? parseInt(match[1], 10) : 1;
  const end = match[2] ? parseInt(match[2], 10) : lineCount;
  if (!start || start > lineCount || end < start) return null;
  return { start, end: Math.min(end, lineCount) };
}

/** cat, with cat -n (numbered) and sed-style ranges. */
export function runCat(
  content: string,
  opts: { numbered?: boolean; range?: string } = {},
): EditResult {
  const lines = content.split("\n");
  const range = parseRange(opts.range, lines.length);
  if (!range) {
    const error = `cat: invalid range '${opts.range}' (use \"start-end\", e.g. \"12-40\")`;
    return { ok: false, content, changed: 0, output: error, error };
  }
  const out: string[] = [];
  for (let i = range.start; i <= range.end; i++) {
    out.push(
      opts.numbered
        ? `${String(i).padStart(6)}\t${lines[i - 1]}`
        : lines[i - 1],
    );
  }
  return { ok: true, content, changed: 0, output: out.join("\n") };
}

// ---------------------------------------------------------------------------
// grep
// ---------------------------------------------------------------------------

/** grep one page's content; the caller formats path:line:text. */
export function grepContent(
  content: string,
  pattern: string,
  opts: { ignoreCase?: boolean } = {},
): { matches: GrepMatch[]; error?: string } {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, opts.ignoreCase ? "i" : "");
  } catch {
    return { matches: [], error: `grep: invalid pattern '${pattern}'` };
  }
  const matches: GrepMatch[] = [];
  content.split("\n").forEach((text, index) => {
    if (regex.test(text)) {
      matches.push({ line: index + 1, text: truncateLine(text) });
    }
  });
  return { matches };
}

// ---------------------------------------------------------------------------
// sed (subset: N,M addresses, s///flags with g/i, d, and ';' command lists)
// ---------------------------------------------------------------------------

interface SedCommand {
  type: "s" | "d";
  start: number;
  end: number;
  regex?: RegExp;
  replacement?: string;
}

/** Convert sed replacement syntax (&, \\1..\\9, \\n, \\) to JS ($&, $1, …). */
function replacementToJs(repl: string): string {
  let out = "";
  for (let i = 0; i < repl.length; i++) {
    const ch = repl[i];
    if (ch === "\\") {
      const next = repl[i + 1];
      i++;
      if (next === "\\") out += "\\\\";
      else if (next === "n") out += "\\n";
      else if (next === "t") out += "\\t";
      else if (next && next >= "0" && next <= "9") out += `$${next}`;
      else out += next ?? "";
    } else if (ch === "&") {
      out += "$&";
    } else if (ch === "$") {
      out += "$$";
    } else {
      out += ch;
    }
  }
  return out;
}

/** Split a sed script on ';' without breaking inside s/…/…/… commands. */
function splitSedCommands(script: string): string[] {
  const out: string[] = [];
  let current = "";
  for (let i = 0; i < script.length; i++) {
    const ch = script[i];
    if (ch === "\\") {
      current += ch + (script[i + 1] ?? "");
      i++;
      continue;
    }
    const next = script[i + 1];
    if (ch === "s" && next && !/[\s]/.test(next)) {
      // Consume s<delim>pattern<delim>replacement<delim>flags
      const delim = next;
      current += ch + delim;
      let fields = 0;
      let j = i + 2;
      while (j < script.length && fields < 2) {
        const c = script[j];
        if (c === "\\") {
          current += c + (script[j + 1] ?? "");
          j += 2;
          continue;
        }
        current += c;
        j++;
        if (c === delim) fields++;
      }
      while (j < script.length && script[j] !== ";" && script[j] !== "\n") {
        current += script[j];
        j++;
      }
      i = j - 1;
      continue;
    }
    // ';' and newlines both separate commands (models write multi-line sed
    // scripts the way real sed expects).
    if (ch === ";" || ch === "\n") {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function parseSed(script: string): { commands: SedCommand[]; error?: string } {
  const commands: SedCommand[] = [];
  for (const raw of splitSedCommands(script)) {
    let text = raw.trim();
    if (!text) continue;

    let start = 1;
    let end = Number.MAX_SAFE_INTEGER;
    const address = /^(\d+)(?:,(\d+))?/.exec(text);
    if (address) {
      start = parseInt(address[1], 10);
      end = address[2] ? parseInt(address[2], 10) : start;
      text = text.slice(address[0].length).trim();
    } else if (text.startsWith("$")) {
      return {
        commands,
        error:
          "sed: '$' addresses are not supported — use line numbers (see grep or cat with numbered: true)",
      };
    }

    if (text.startsWith("s")) {
      const delim = text[1];
      if (!delim || /\s/.test(delim)) {
        return { commands, error: `sed: malformed s command '${text}'` };
      }
      // Split the remainder on the delimiter (escape-aware) into
      // pattern / replacement / flags
      const fields: string[] = [];
      let field = "";
      let escaped = false;
      for (let i = 2; i < text.length; i++) {
        const ch = text[i];
        if (escaped) {
          field += "\\" + ch;
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === delim) {
          fields.push(field);
          field = "";
          if (fields.length === 2) {
            field = text.slice(i + 1); // flags
            break;
          }
          continue;
        }
        field += ch;
      }
      if (fields.length < 2) {
        return { commands, error: `sed: malformed s command '${text}'` };
      }
      const [pattern, replacement] = fields;
      // Models routinely append stray whitespace/newlines to flag strings —
      // strip them before validating.
      const flags = field.replace(/\s+/g, "");
      for (const flag of flags) {
        if (!"gi".includes(flag)) {
          return {
            commands,
            error: `sed: unsupported flag '${flag}' (supported: g, i — nothing else)`,
          };
        }
      }
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, flags.replace(/[^gi]/g, ""));
      } catch {
        return { commands, error: `sed: invalid pattern '${pattern}'` };
      }
      commands.push({
        type: "s",
        start,
        end,
        regex,
        replacement: replacementToJs(replacement),
      });
    } else if (text === "d") {
      commands.push({ type: "d", start, end });
    } else {
      return {
        commands,
        error: `sed: unsupported command '${text}' (supported: s/pattern/replacement/flags and d, with optional N,M address and ';' lists)`,
      };
    }
  }
  if (!commands.length) {
    return { commands, error: "sed: empty script" };
  }
  return { commands };
}

export function runSed(content: string, script: string): EditResult {
  const parsed = parseSed(script);
  if (parsed.error) {
    return {
      ok: false,
      content,
      changed: 0,
      output: parsed.error,
      error: parsed.error,
    };
  }

  const lines = content.split("\n");
  const deletions = new Set<number>();
  const changes: Array<{ line: number; before: string; after: string }> = [];

  for (const cmd of parsed.commands) {
    const from = Math.max(cmd.start, 1);
    const to = Math.min(cmd.end, lines.length);
    for (let i = from; i <= to; i++) {
      const idx = i - 1;
      if (deletions.has(idx)) continue;
      if (cmd.type === "d") {
        deletions.add(idx);
        continue;
      }
      const before = lines[idx];
      const after = before.replace(cmd.regex!, cmd.replacement!);
      if (after !== before) {
        lines[idx] = after;
        changes.push({ line: i, before, after });
      }
    }
  }

  const changed = changes.length + deletions.size;
  if (!changed) {
    return {
      ok: true,
      content,
      changed: 0,
      output: "sed: no matching lines — nothing changed",
    };
  }

  const out: string[] = [`sed: ${changed} line(s) changed`];
  for (const change of changes.slice(0, 20)) {
    out.push(
      `-${String(change.line).padStart(5)}: ${truncateLine(change.before)}`,
    );
    out.push(
      `+${String(change.line).padStart(5)}: ${truncateLine(change.after)}`,
    );
  }
  for (const idx of [...deletions].sort((a, b) => a - b).slice(0, 20)) {
    out.push(
      `-${String(idx + 1).padStart(5)}: ${truncateLine(lines[idx])} (deleted)`,
    );
  }
  if (changed > 20) out.push(`… ${changed - 20} more line(s)`);

  const next = lines.filter((_, idx) => !deletions.has(idx)).join("\n");
  return { ok: true, content: next, changed, output: out.join("\n") };
}

// ---------------------------------------------------------------------------
// patch (unified diff hunks with fuzzy start matching)
// ---------------------------------------------------------------------------

interface PatchHunk {
  oldStart: number;
  oldCount: number;
  oldBlock: string[];
  newBlock: string[];
}

function parseUnifiedPatch(patchText: string): {
  hunks: PatchHunk[];
  error?: string;
} {
  // A trailing newline would otherwise become a bare "" context line that
  // can never match the end of the hunk.
  const patchLines = patchText.replace(/\n+$/, "").split("\n");
  const hunks: PatchHunk[] = [];
  for (let i = 0; i < patchLines.length; i++) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(
      patchLines[i],
    );
    if (!header) continue;
    const oldStart = parseInt(header[1], 10);
    const oldCount = header[2] ? parseInt(header[2], 10) : 1;
    const oldBlock: string[] = [];
    const newBlock: string[] = [];
    i++;
    while (i < patchLines.length) {
      const line = patchLines[i];
      if (
        line.startsWith("@@") ||
        line.startsWith("---") ||
        line.startsWith("+++")
      ) {
        break;
      }
      const tag = line[0];
      const text = line.slice(1);
      if (tag === "\\") {
        // "\ No newline at end of file" marker
      } else if (tag === "-") {
        oldBlock.push(text);
      } else if (tag === "+") {
        newBlock.push(text);
      } else {
        // Context (' ' or bare empty line)
        oldBlock.push(tag === " " ? text : line);
        newBlock.push(tag === " " ? text : line);
      }
      i++;
    }
    i--;
    if (!oldBlock.length && !newBlock.length) continue;
    hunks.push({ oldStart, oldCount, oldBlock, newBlock });
  }
  if (!hunks.length) {
    return {
      hunks,
      error: "patch: no hunks found (expected @@ -a,b +c,d @@ blocks)",
    };
  }
  return { hunks };
}

/**
 * Normalization used only for *matching* hunk context (never for writing):
 * models routinely mangle quotes and backslashes when they copy page text into
 * tool arguments (observed: `\\\retransition\\\` where the page has plain
 * `"retransition"`), which makes an otherwise-correct hunk fail to match.
 */
function normalizeForMatch(line: string, ignoreQuotes = false): string {
  let out = line
    .replace(/\\+(.)/g, "$1") // collapse escape runs: \\' -> ', \\ -> \
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (ignoreQuotes) out = out.replace(/['"]/g, "");
  return out;
}

type MatchMode = "exact" | "trim" | "normalize" | "loose";

function findHunkStart(
  work: string[],
  hunk: PatchHunk,
  expected: number,
  mode: MatchMode = "exact",
): number {
  const eq = (a: string | undefined, b: string) => {
    if (a === undefined) return false;
    if (mode === "exact") return a === b;
    if (mode === "trim") return a.trim() === b.trim();
    const ignoreQuotes = mode === "loose";
    return normalizeForMatch(a, ignoreQuotes) === normalizeForMatch(b, ignoreQuotes);
  };
  const matchesAt = (start: number) => {
    if (start < 0 || start + hunk.oldBlock.length > work.length) return false;
    return hunk.oldBlock.every((line, i) => eq(work[start + i], line));
  };

  if (expected >= 0 && matchesAt(expected)) return expected;
  // Fuzz: search outwards from the expected position, then the whole file
  const FUZZ = 30;
  for (let d = 1; d <= FUZZ; d++) {
    if (matchesAt(expected - d)) return expected - d;
    if (matchesAt(expected + d)) return expected + d;
  }
  for (let start = 0; start <= work.length - hunk.oldBlock.length; start++) {
    if (matchesAt(start)) return start;
  }
  return -1;
}

export function applyUnifiedPatch(
  content: string,
  patchText: string,
): EditResult {
  const parsed = parseUnifiedPatch(patchText);
  if (parsed.error) {
    return {
      ok: false,
      content,
      changed: 0,
      output: parsed.error,
      error: parsed.error,
    };
  }

  const work = content.split("\n");
  let offset = 0;
  let removed = 0;
  let added = 0;
  const applied: number[] = [];

  for (const hunk of parsed.hunks) {
    const expected = hunk.oldStart - 1 + offset;
    // Exact match first, then progressively fuzzier tiers: whitespace
    // tolerance (model re-flows leave trailing-whitespace drift), escape
    // normalization (models double-escape quotes/backslashes in tool
    // arguments), and finally quote-insensitive matching (models sometimes
    // replace quote characters with escape noise entirely).
    let start = findHunkStart(work, hunk, expected);
    if (start < 0) {
      start = findHunkStart(work, hunk, expected, "trim");
    }
    if (start < 0) {
      start = findHunkStart(work, hunk, expected, "normalize");
    }
    if (start < 0) {
      start = findHunkStart(work, hunk, expected, "loose");
    }
    if (start < 0) {
      const want = (hunk.oldBlock.find((l) => l.trim()) ?? "").trim();
      const got = (work[expected] ?? "(end of file)").trim();
      // Show the actual surrounding lines so the model can rebuild its context
      // instead of retrying the same broken hunk over and over.
      const from = Math.max(0, expected - 2);
      const to = Math.min(work.length, expected + 3);
      const actual = work
        .slice(from, to)
        .map((line, i) => `  ${from + i + 1}: ${truncateLine(line)}`)
        .join("\n");
      const error =
        `patch: hunk @@ -${hunk.oldStart},${hunk.oldCount} @@ failed — context not found. ` +
        `expected '${want.slice(0, 70)}' but line ${expected + 1} is '${got.slice(0, 70)}'. ` +
        `The page currently reads around that line:\n${actual}\n` +
        `Do NOT retry the identical patch — rewrite the context lines from this actual content (copy them verbatim, without re-escaping quotes).`;
      return { ok: false, content, changed: 0, output: error, error };
    }
    work.splice(start, hunk.oldBlock.length, ...hunk.newBlock);
    const oldAdded = hunk.newBlock.filter(
      (_, i) => i >= hunk.oldBlock.length,
    ).length;
    offset += hunk.newBlock.length - hunk.oldBlock.length;
    removed += hunk.oldBlock.length;
    added += hunk.newBlock.length;
    applied.push(hunk.oldStart + oldAdded);
  }

  const changed = removed + added;
  const out = [
    `patch: ${applied.length} hunk(s) applied, ${changed} line(s) touched`,
  ];
  for (let i = 0; i < parsed.hunks.length; i++) {
    out.push(
      `@@ -${parsed.hunks[i].oldStart},${parsed.hunks[i].oldCount} @@ applied`,
    );
  }

  return {
    ok: true,
    content: work.join("\n"),
    changed,
    output: out.join("\n"),
  };
}
