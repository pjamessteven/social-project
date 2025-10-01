export function extractQuestionsFromString(input: string): string[] {
  // Remove the leading "QUESTIONS:" (case-insensitive, allow whitespace)
  const cleaned = input.replace(/^\s*QUESTIONS:\s*/i, "").trim();

  // Split by a question mark, keeping the question mark
  const rawParts = cleaned.split("?");

  // Re-add "?" to everything except the last (if empty after split)
  const questions = rawParts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      // Strip leading numbering like "1.", "2." or "123." if present
      const withoutNumbers = part.replace(/^\d+\.\s*/, "").trim();
      return withoutNumbers + "?";
    });

  return questions;
}
