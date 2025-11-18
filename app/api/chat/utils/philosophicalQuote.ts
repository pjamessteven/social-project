import { PostgresCache } from "../../shared/cache";
import { CachedOpenAI } from "../../shared/llm";

export const generatePhilosophicalQuote = async (
  message: string,
  conversationId: string,
) => {
  const cache = new PostgresCache("detrans_chat");

  const llm = new CachedOpenAI({
    cache,
    mode: "detrans_chat",
    apiKey: process.env.OPENROUTER_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    model: "moonshotai/kimi-k2-0905:exacto",
    conversationId,
  });
  const completion = await llm.complete({
    prompt: `Read the following message and if it could be relevant, return a short philosophica note with a quote from one of the listed philosophers and an explanation of how it relates to the message. 
    Return plain text only! No fancy formatting.
    Only return a philosophical note if it is relevant to the concept we are talking about. If you decide not to return a philosophical note, return only the text 'NO NOTE' 
    **Approved shortlist:** Alan Watts, Aristotle, Wittgenstein, Putnam, Haslanger, Appiah, Hacking, or Taylor, Kathleen Stock, Rebecca Reilly-Cooper, Holly Lawford-Smith, Mary Midgley, Charles Taylor, Paul Ricoeur, Kwame Anthony Appiah, Ian Hacking, Susan Brison, Jung. 
    
    The message: 
    ${message}`,
  });
  if (completion.text.toLocaleLowerCase().includes("no note")) {
    return null;
  } else return completion.text;
};
