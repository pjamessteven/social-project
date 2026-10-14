/**
 * Short card copy + category classification for studies.
 *
 * Shared by the admin extract route (from the paper's full text) and
 * scripts/backfill-study-cards.ts (from the stored abstract/summary/etc.),
 * so both produce the same shape and length limits.
 */

export const CARD_SUMMARY_MAX_CHARS = 180;
export const CARD_KEY_POINTS_COUNT = 3;
export const CARD_KEY_POINT_MAX_CHARS = 80;

export interface CardCategoryOption {
  id: number;
  kind: "topic" | "method";
  slug: string;
  name: string;
  description: string;
}

export interface StudyCardResult {
  cardSummary: string;
  cardKeyPoints: string[];
  method: string | null;
  topics: string[];
}

function listCategories(
  categories: CardCategoryOption[],
  kind: CardCategoryOption["kind"],
) {
  return categories
    .filter((c) => c.kind === kind)
    .map((c) => `- ${c.slug}: ${c.name} — ${c.description}`)
    .join("\n");
}

export function buildStudyCardPrompt(
  categories: CardCategoryOption[],
  source: string,
): string {
  return `You are an academic research assistant writing compact cards for a library of studies about gender dysphoria, transition and detransition. Readers are a general audience scanning a grid of cards.

Write:
1. "cardSummary": ONE plain-language sentence (two only if unavoidable), max ${CARD_SUMMARY_MAX_CHARS} characters, saying what was studied, in whom, and the headline result. No hype, no rhetorical questions, do not start with "This study" or the author's name.
2. "cardKeyPoints": exactly ${CARD_KEY_POINTS_COUNT} findings, each a short fragment of max ${CARD_KEY_POINT_MAX_CHARS} characters, concrete and specific. Don't repeat the summary. No trailing full stops.
Only use numbers that appear in the source text below, exactly as written there; if sources disagree, prefer the abstract.
3. "method": the ONE slug that best describes how the study was done:
${listCategories(categories, "method")}
4. "topics": slugs for what the study is mainly about, most relevant first. Usually 1 or 2; add a 3rd only if it is just as central. Never pick a topic that is only mentioned in passing or as background:
${listCategories(categories, "topic")}

Return ONLY a valid JSON object with exactly these keys and no other text:
{ "cardSummary": string, "cardKeyPoints": string[], "method": string, "topics": string[] }

Study:
---
${source}
---`;
}

/** Parse + validate an LLM response against the known category slugs. */
export function parseStudyCardResponse(
  text: string,
  categories: CardCategoryOption[],
): StudyCardResult {
  let jsonStr = text.trim();
  const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();
  const parsed = JSON.parse(jsonStr) as Partial<StudyCardResult>;

  const methodSlugs = new Set(
    categories.filter((c) => c.kind === "method").map((c) => c.slug),
  );
  const topicSlugs = new Set(
    categories.filter((c) => c.kind === "topic").map((c) => c.slug),
  );

  const cardSummary =
    typeof parsed.cardSummary === "string" ? parsed.cardSummary.trim() : "";
  const cardKeyPoints = Array.isArray(parsed.cardKeyPoints)
    ? parsed.cardKeyPoints
        .filter((p): p is string => typeof p === "string")
        .map((p) => p.trim().replace(/\.$/, ""))
        .filter(Boolean)
        .slice(0, CARD_KEY_POINTS_COUNT)
    : [];
  const method =
    typeof parsed.method === "string" && methodSlugs.has(parsed.method)
      ? parsed.method
      : null;
  const topics = Array.isArray(parsed.topics)
    ? [...new Set(parsed.topics)]
        .filter((t): t is string => typeof t === "string" && topicSlugs.has(t))
        .slice(0, 3)
    : [];

  if (!cardSummary || cardKeyPoints.length === 0) {
    throw new Error("Card response missing summary or key points");
  }
  return { cardSummary, cardKeyPoints, method, topics };
}

/** Map a parsed card result's slugs back to category ids. */
export function cardCategoryIds(
  result: Pick<StudyCardResult, "method" | "topics">,
  categories: CardCategoryOption[],
): number[] {
  const ids: number[] = [];
  for (const c of categories) {
    if (c.kind === "method" && c.slug === result.method) ids.push(c.id);
    if (c.kind === "topic" && result.topics.includes(c.slug)) ids.push(c.id);
  }
  return ids;
}
