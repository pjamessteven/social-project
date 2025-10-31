import { OpenAI } from "@llamaindex/openai";

import { ChatMessage } from "llamaindex";
const llm = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  model: "moonshotai/kimi-k2-0905:exacto",
  maxTokens: 1,
});

const classifyIntentPrompt = `User: Compare the new Apple M4 vs M3 chip
Intent: research
User: How was your weekend?
Intent: chat
User: I'm questioning my gender identity
Intent: chat
User: What is a gender fluid child?
Intent: research
User: What is a gender fluid child?
Intent: research
User: {{ACTUAL_USER_MESSAGE}}
Intent:`;

export async function classifyIntent(userMsg: string) {
  const prompt = `${classifyIntentPrompt}\nUser: ${userMsg}\nIntent:`;

  const resp = await llm.chat({
    stream: false,
    messages: [{ role: "user", content: prompt } as ChatMessage],
  });

  return (resp.message.content as string).trim(); // "research" | "chat" | "code"
}
