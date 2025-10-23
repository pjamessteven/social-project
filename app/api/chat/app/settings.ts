import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { Settings } from "llamaindex";
import { DeepSeekLLM } from "@llamaindex/deepseek";

export function initSettings() {
  Settings.llm = new DeepSeekLLM({
    apiKey: process.env.DEEPSEEK_KEY,
    model: "deepseek-chat" as 'deepseek-chat',
  });
  Settings.embedModel = new OpenAIEmbedding({
    model: process.env.EMBEDDING_MODEL,
    dimensions: process.env.EMBEDDING_DIM
      ? parseInt(process.env.EMBEDDING_DIM)
      : undefined,
  });
}
