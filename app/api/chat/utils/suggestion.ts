import { getEnv } from "@llamaindex/env";
import { OpenAI } from "@llamaindex/openai";
import type { DataStreamWriter } from "ai";
import { type ChatMessage } from "llamaindex";
import { PostgresCache } from "../../shared/cache";
import { NEXT_QUESTION_PROMPT } from "../affirm/prompts";

export const sendSuggestedQuestionsEvent = async (
  streamWriter: DataStreamWriter,
  chatHistory: ChatMessage[] = [],
  mode: "detrans" | "affirm",
  originalQuestion: string,
) => {
  const cache = new PostgresCache("detrans");
  const cachedNextQuestions = await cache.get(
    originalQuestion + ":suggested_questions",
  );
  let questions;
  if (cachedNextQuestions) {
    console.log("CACHED QUETIONS", cachedNextQuestions);
    questions = JSON.parse(cachedNextQuestions);
  } else {
    questions = await generateNextQuestions(chatHistory);

    await cache.set(
      originalQuestion + ":suggested_questions",
      JSON.stringify(questions),
      originalQuestion,
    );
  }

  if (questions.length > 0) {
    streamWriter.writeMessageAnnotation({
      type: "suggested_questions",
      data: questions,
    });
  }
};

export async function generateNextQuestions(conversation: ChatMessage[]) {
  const kimi = new OpenAI({
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "moonshotai/kimi-k2",
  });
  const conversationText = conversation
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
  const promptTemplate = getEnv("NEXT_QUESTION_PROMPT") || NEXT_QUESTION_PROMPT;
  const message = promptTemplate.replace("{conversation}", conversationText);

  try {
    const response = await kimi.complete({ prompt: message });
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
