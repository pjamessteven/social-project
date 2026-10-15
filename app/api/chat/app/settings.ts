import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { Settings } from "llamaindex";
import { DeepSeekLLM } from "@llamaindex/deepseek";

export function initSettings() {
  /*
  Settings.llm = new DeepSeekLLM({
    apiKey: process.env.DEEPSEEK_KEY,
    model: "deepseek-chat" as 'deepseek-chat',
  });
  */
 Settings.llm = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  model: "moonshotai/kimi-k2-0905:exacto",
});
  // Embeddings go through OpenRouter too. Same OpenAI model, so query
  // vectors stay compatible with the ones already stored in Qdrant.
  Settings.embedModel = new OpenAIEmbedding({
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: `openai/${process.env.EMBEDDING_MODEL}`,
    dimensions: process.env.EMBEDDING_DIM
      ? parseInt(process.env.EMBEDDING_DIM)
      : undefined,
  });
}
