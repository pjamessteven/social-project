import { getEnv } from "@llamaindex/env";
import type { UIMessageStreamWriter } from "ai";
import { type ChatMessage } from "llamaindex";
import { PostgresCache } from "../../shared/cache";
import { CachedOpenAI } from "../../shared/llm";
import { NEXT_QUESTION_PROMPT } from "./prompts";

export const sendSuggestedQuestionsEvent = async (
  streamWriter: UIMessageStreamWriter,
  chatHistory: ChatMessage[] = [],
  conversationId: string,
) => {
  const questions = await generateNextQuestions(chatHistory, conversationId);
  if (questions.length > 0) {
    streamWriter.write({
      type: "data-suggested_questions",
      data: questions,
    });
  }
};

export async function generateNextQuestions(
  conversation: ChatMessage[],
  conversationId: string,
) {
  const cache = new PostgresCache("deep_research");

  const llm = new CachedOpenAI({
    cache,
    mode: "detrans_chat",
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "moonshotai/kimi-k2-0905:exacto",
    conversationId,
  });

  const conversationText = conversation
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
  const promptTemplate = getEnv("NEXT_QUESTION_PROMPT") || NEXT_QUESTION_PROMPT;
  const message = promptTemplate.replace("{conversation}", conversationText);

  try {
    const response = await llm.complete({ prompt: message });
    const questions = extractQuestions(response.text);
    return questions;
  } catch (error) {
    console.error("Error when generating the next questions: ", error);
    return [];
  }
}

function extractQuestions(text: string): string[] {
  // Extract the text inside the triple backticks
  const contentMatch = text.match(/```(.*?)```/s);
  const content = contentMatch?.[1] ?? "";

  // Split the content by newlines to get each question
  const questions = content
    .split("\n")
    .map((question) => question.trim())
    .filter((question) => question !== "");

  return questions;
}
