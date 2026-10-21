/**
 * Hands a first message to a new chat conversation without putting it in the
 * URL. `?starter=` slugs lowercase the text and drop its line breaks, and a
 * pasted comment can be far too long for a query string, so callers that need
 * the exact text (e.g. the studies page's debunk card) stash it here keyed by
 * the conversation id and navigate to `/chat/{id}`; ChatSection takes it once
 * the empty conversation has loaded.
 */

const KEY_PREFIX = "detrans:pending-message:";

export function setPendingMessage(conversationId: string, text: string) {
  try {
    window.sessionStorage.setItem(KEY_PREFIX + conversationId, text);
  } catch {
    // Storage unavailable (private mode, quota): the chat just opens empty
  }
}

/** Returns the stashed message for this conversation and removes it. */
export function takePendingMessage(conversationId: string): string | null {
  try {
    const key = KEY_PREFIX + conversationId;
    const text = window.sessionStorage.getItem(key);
    if (text !== null) window.sessionStorage.removeItem(key);
    return text;
  } catch {
    return null;
  }
}
