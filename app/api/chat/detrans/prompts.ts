import { PromptTemplate } from "llamaindex";

export const NEXT_QUESTION_PROMPT = `You're a helpful assistant! 
Your task is to suggest the next question that user might ask. 
Here is the conversation history
---------------------
{conversation}
---------------------
Given the conversation history, please give me 3 questions that user might ask next!
Your answer should be wrapped in three sticks which follows the following format:
\`\`\`
<question 1>
<question 2>
<question 3>
\`\`\`
`;

// Custom prompt template
export const questionPrompt = `(
  Given the contextual informations below, generate up to {numQuestions} questions this context can provides specific answers to which are unlikely to be found else where. Higher-level summaries of surrounding context may be provided as well. 
  the context is a comment or experience from a transgender person who has detransitioned.
  Try using these summaries to generate better questions that this context can answer.
  ---------------------
  {context}"
  ---------------------
  Provide questions in the following format: 'QUESTIONS: <questions>'
)`;

export const SummaryPrompt = `(
Write a short and concise title for the following comment or post. Start the title with 'Reddit user [username] ([userFlair if exists]) explains/comments/posted about/discusses, etc. Try to include as many key details as possible.

{context}

SUMMARY:"""
)`;

export const KeywordPrompt = `{context}
Give up to {maxKeywords} unique and relevant keywords for this document. include the persons sex (detrans male or detrans female) if possible.  Prioritize keywords that relate to healing and mental health, as well as transition reason, transition regret and harm if the user experienced them, sciencentific skepticism, sciencentific terms, sociological terms, jungian terms, philosophical terms, multilation regret, depression, grooming, child grooming, victim mentality, stereoptypes, cult, fetishes, algorithms, brainwashing, etc. ). Only inlcude the following keywords if they explain the reason why they originally transitioned: AGP, internalised homophobia/misogony/misandry, trauma, autism, etc.
Format as comma   separated. 
Keywords: `;

export const TitlePrompt = `{context}
Give a title that summarizes all of the unique titles, themes or topics found in the context. 
Title:""" `;

export const TitleCombinePrompt = `{context} 
Based on the above candidate titles and contents, what is the comprehensive title for this comment or post? Start the title with 'Reddit user [username] ([userFlair if exists]) explains/comments/posted about/discusses, etc.'
Title: `;

export const createPlanResearchPrompt = (MAX_QUESTIONS: number) =>
  new PromptTemplate({
    template: `TASK
You are a social science professor who is guiding a researcher to research a specific request/problem.
Your task is to decide on a research plan for the researcher.

POSSIBLE ACTIONS
- Provide a list of questions for the researcher to investigate, with the purpose of clarifying the request. The questions MUST derive from the questions in the context. 
- Write a summary that highlights the main points and the comments that relate to the original question if the researcher has already gathered enough research on the topic and can resolve the initial request.
- Cancel the research if most of the answers from researchers indicate there is insufficient information to research the request. Do not attempt more than 3 research iterations or too many questions.

WORKFLOW
- Always begin by providing up to ${MAX_QUESTIONS} questions for the researcher to investigate. The questions MUST come directly from the questions in the context. You may abbreviate them. 
- Analyze the provided answers against the initial topic/request. If the answers are insufficient to resolve the initial request, provide additional questions for the researcher to investigate.
- If the answers are sufficient to resolve the initial request, instruct the researcher to write a summary.

Here is the context: 
<Collected information>
{context_str}
</Collected information>

<Conversation context>
{conversation_context}
</Conversation context>

{enhanced_prompt}

Now, provide your decision in the required format for this user request:
<User request>
{user_request}
</User request>
`,
    templateVars: [
      "context_str",
      "conversation_context",
      "enhanced_prompt",
      "user_request",
    ],
  });

export const researchPrompt = new PromptTemplate({
  template: `
TASK
Find and share the most relevant personal experiences from the provided context that answer the user's question.

HOW TO FORMAT EACH EXPERIENCE
**Reddit user [username]** ([detrans male/detrans female]) [verb: explains, describes, shares, etc.] "[brief summary of their point]":

*"[Full exact text of their comment]"* - [source](full_link_url) [citation:citation_id]*

**Example:**
**Reddit user CareyCallahan** (detrans female) explains "how they were a 'true believer' in their trans identity":

*"I think about this all the time. Because like when I was in it, I was really in it, I was a true believer..."* - [source](https://reddit.com/r/detrans/comments/example) [citation:abc-xyz]

WORKFLOW
  1. Pick 3-5 of the most relevant experiences from the context.
  2. Use the exact formatting shown above.
  3. Use present-tense verbs like *explains*, *describes*, *shares*.
  4. After listing the experiences, write a short summary under a **Summary of answers** header.

**Use only this context to answer the question:**
<Collected information>
{context_str}
</Collected information>

**User's question:** {question}
`,
  templateVars: ["context_str", "question"],
});

export const writeReportPrompt = `
TASK
You are summarizing insights from personal accounts to answer a sensitive question about identity. Your summary must be informative and compassionate. It must reference the experiences in the context.

AUDIENCE
- Primary: teen or adult asking “Why don’t I feel like a ‘real’ man/woman?”
- Secondary: friends/family who want to understand without jargon.

VOICE
- Warm, hopeful, like an older cousin who has been there.
- Use everyday words; explain any technical term in the same sentence.
- Never use acronyms (e.g., write “gender non-conforming”, not “GNC”).

CORE PHILOSOPHICAL VIEW
Gender is a set of social expectations, not an inner essence.
Celebrate refusing the boxes; show that psychological & community support can ease distress; keep the spotlight on non-medical paths to peace of mind.

GUARD-RAILS
- Do not recommend hormones or surgery.
- Do not instruct readers to change pronouns.

WORKFLOW
1. Read the personal stories in the context.
2. Pick 3–5 themes from the stories that help answer the user’s identity question.
3. For each theme:
   - Give it a **Bold heading**
   - Write a detailed and informative paragraph 
   - Only use information from the context
   - **Always** weave in 1-2 quotes from the context
   - Quote format: *"text"* – **UserName** [source](url) [citation:citation_id]
4. Conclude with a summary that ties the themes together and reinforces the message of self-understanding and non-medical paths to well-being”
`;
