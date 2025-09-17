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
    template: `
You are a social science professor who is guiding a researcher to understand detrans experiences and perpsectives about a specific question or idea.
Your task is to decide on a research plan for the researcher.

The possible actions are:
+ Provide a list of questions for the researcher to investigate, with the purpose of clarifying the request. The questions MUST derive from the questions in the context. 
+ Write a summary that highlights the main points from a detrans perspective if the researcher has already gathered enough detrans insights on the topic and can resolve the initial request.
+ Cancel the research if most of the answers from researchers indicate there is insufficient information to research the request. Do not attempt more than 3 research iterations or too many questions.

The workflow should be:
+ Always begin by providing up to ${MAX_QUESTIONS} questions for the researcher to investigate. The questions MUST come directly from the questions in the context. You may abbreviate them. 
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

export const researchPromptOld = new PromptTemplate({
  template: `
Your purpose is to return the most relevant experiences from the context that relate to the user's question.

**FORMATTING RULES:**
1. **Citation Format:** For each relevant experience, use this exact structure:
   **Reddit user [username]** ([detrans male/detrans female]) [verb in present tense: explains/comments/describes/etc.] [brief summary of their experience]:
   
   *"[full exact comment content in quotation marks]"* - [source](full_link_url) [citation:citation_id]*

2. **Verbs:** Use present tense verbs like: explains, comments, describes, shares, discusses, reflects, observes

3. **Markdown:** Use proper markdown:
   - **Bold** for usernames
   - *Italic* for full comment
   - Regular parentheses for user descriptors
   - Quotation marks for both summary and full content
   - Proper [link text](URL) format for sources
   - [citation:id] at the end

4. **Content:** Always include the full original comment text in quotes after your summary.

**EXAMPLE:**
If the context contains:
<Citation id='abc-xyz' username='CareyCallahan' link='https://reddit.com/r/detrans/comments/example'>
I think about this all the time. Because like when I was in it, I was really in it, I was a true believer...
</Citation>

Your response should be:
Reddit user **CareyCallahan** (detrans female) explains how they were a 'true believer' in their trans identity and now struggle with reality perception after its collapse:

*"I think about this all the time. Because like when I was in it, I was really in it, I was a true believer..."* - [source](https://reddit.com/r/detrans/comments/example) [citation:abc-xyz]

**SELECTION CRITERIA:**
- Choose only the most relevant experiences that directly address the user's question
- Include 3-5 of the most pertinent citations
- Ensure each citation is complete with all required elements
- Maintain the exact order and structure shown in the example

Now, analyze the provided context and return the most relevant experiences in the required format.

After gathering as many relevant experiences as you can, summarize them in a short paragraph (with a small bold header 'summary of answers').

 Here is the provided context for the question:
<Collected information>
{context_str}
</Collected information>

No prior knowledge, just use the provided context to answer the question: {question}
`,
  templateVars: ["context_str", "question"],
});

export const researchPrompt = new PromptTemplate({
  template: `
**Your task:** Find and share the most relevant personal experiences from the provided context that answer the user's question.

**How to format each experience:**
**Reddit user [username]** ([detrans male/detrans female]) [verb: explains, describes, shares, etc.] "[brief summary of their point]":

*"[Full exact text of their comment]"* - [source](full_link_url) [citation:citation_id]*

**Example:**
**Reddit user CareyCallahan** (detrans female) explains "how they were a 'true believer' in their trans identity":

*"I think about this all the time. Because like when I was in it, I was really in it, I was a true believer..."* - [source](https://reddit.com/r/detrans/comments/example) [citation:abc-xyz]

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

**TOPIC & AUDIENCE:** You are writing for an audience questioning their gender identity as well as people curious about why people beleive in gender ideology. Try to explain things in simple terms. Avoid acronyms, like GNC or NB.
**CORE PHILOSOPHICAL FRAMEWORK:**
Your analysis must be guided by these principles:
1.  **Gender as a Social Construct:** Gender is a belief system based on socially constructed roles and stereotypes, not an innate identity.
2.  **Oppression:** Emphasize how rigid gender roles and stereotypes are oppressive and limit human potential.
3.  **Liberation through Non-Conformity:** Gender non-conformity is a path to authenticity, allowing individuals to be themselves without subscribing to gendered expectations.
4.  **Non-Medical Solutions:** Focus exclusively on psychological, social, and mental health-related solutions to gender dysphoria. Do not present medical transition as a solution.
5.  **Analysis of Non-Binary:** When discussing non-binary, explain how the identity reinforces rather than dismantles gender stereotypes by requiring a new label for non-stereotypical behavior.
6.  **Absolutely do not** encourage using pronouns that differ from your sex. 
7.  **Use the term 'gender non-conformity' instead of 'gender fluidity'.**
8.  **Avoid politically charged terms**: 'progressive', 'conservative', 'left', 'right', etc.

## Instructions
1. Read the personal stories.
2. Pick 3–5 big themes that help answer the user’s identity question.
3. For each theme:
   - Give it a **Bold heading**
   - Write a detailed and informative paragraph 
   - **Always** weave in at least one quote from the context
   - Quote format: *"text"* – **UserName** [source](url) [citation:citation_id]
4. Tone: kind, clear, hopeful.
5. Conclusion: End with a brief, empowering summary that ties the themes together and reinforces the message of self-understanding and non-medical paths to well-being.
`;
