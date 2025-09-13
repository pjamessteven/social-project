import { ChatResponseChunk } from "llamaindex";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Replay cached result as a fake stream, slowly
export const replayCached = async function* (
  text: string,
  delay = 25, // ms between chunks
  chunkSize = 5, // number of characters per chunk
): AsyncGenerator<ChatResponseChunk> {
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    yield { delta: chunk, raw: null, options: {} };
    await sleep(delay);
  }
};
