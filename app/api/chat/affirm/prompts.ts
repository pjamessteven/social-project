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
  the context is a comment or experience from a transgender person.
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
Give up to {maxKeywords} unique and relevant keywords for this document. include the persons identity (FTM/MTF) if possible.  Prioritize keywords that relate to healing, transition, pronouns, identity, top surgery, bottom surgery, hormones, gender affirming care, healthcare, health problems, mental health problems, depression, etc.
Format as comma   separated. 
Keywords: `;

export const TitlePrompt = `{context}
Give a title that summarizes all of the unique titles, themes or topics found in the context. 
Title:""" `;

export const TitleCombinePrompt = `{context} 
Based on the above candidate titles and contents, what is the comprehensive title for this comment or post? Start the title with 'Reddit user [username] ([MTF/FTM]) explains/comments/posted about/discusses, etc.'
Title: `;

export const createPlanResearchPrompt = (MAX_QUESTIONS: number) =>
  new PromptTemplate({
    template: `
You are a social science professor who is guiding a researcher to research a specific request/problem.
Your task is to decide on a research plan for the researcher.

The possible actions are:
+ Provide a list of questions for the researcher to investigate, with the purpose of clarifying the request. The questions MUST derive from the questions in the context. 
+ Write a summary that highlights the main points and the comments that relate to the original question if the researcher has already gathered enough research on the topic and can resolve the initial request.
+ Cancel the research if most of the answers from researchers indicate there is insufficient information to research the request. Do not attempt more than 3 research iterations or too many questions.

The workflow should be:
+ Always begin by providing up to ${MAX_QUESTIONS} initial questions for the researcher to investigate. The questions MUST come directly from the questions in the context. You may abbreviate them. 
+ Analyze the provided answers against the initial topic/request. If the answers are insufficient to resolve the initial request, provide additional questions for the researcher to investigate.
+ If the answers are sufficient to resolve the initial request, instruct the researcher to write a summary.

Here are the context: 
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
**Your task:** Find and share the most relevant personal experiences from the provided context that answer the user's question.

**How to format each experience:**
**Reddit user [username]** ([MTF/FTM]) [verb: explains, describes, shares, etc.] "[brief summary of their point]":

*"[Full exact text of their comment]"* - [source](full_link_url) [citation:citation_id]

**Example:**
**Reddit user SomeoneNoone** (FTM) explains "how they were always truly trans":

*"I think about this all the time. How I am trans..."* - [source](https://reddit.com/r/trans/comments/example) [citation:abc-xyz]

**Instructions:**
- Pick 3-5 of the most relevant experiences from the context.
- Use the exact formatting shown above.
- Use present-tense verbs like *explains*, *describes*, *shares*.
- After listing the experiences, write a short summary under a **Summary of answers** header.

**Use only this context to answer the question:**
<Collected information>
{context_str}
</Collected information>

**User's question:** {question}
`,
  templateVars: ["context_str", "question"],
});

export const writeReportPrompt = `
You are summarizing insights from personal accounts to answer a sensitive question about identity. Your summary must be informative and compassionate. It must reference the experiences in the context.

**TOPIC & AUDIENCE:** You are writing for an audience questioning their gender identity. Try to explain things in simple terms. Avoid acronyms, like GNC or NB.

## Instructions
1. Read the personal stories.
2. Pick 3–5 big themes that help answer the user’s identity question.
3. For each theme:
   - **Bold heading**  
   - Write a detailed and informative paragraph 
   - **Always** weave in at least one quote from the context
   - Quote format: *"text"* – **UserName** [source](url) [citation:citation_id]
4. Tone: kind, clear, hopeful.
5.  **Conclusion:** End with a brief, empowering summary that ties the themes together.
`;
