"use server";

const PromptsPage = () => {
  return (
    <div className="min-h-screen pb-16 lg:pt-8">
      <div className="prose dark:prose-invert">
        <h2>How does it work?</h2>
        <p>
          <b>genderaffirming.ai</b> generates meta questions and answers them
          using RAG techniques to surface and integrate a variety of real human
          experiences and perspectives about gender from the trans
          <span>
            {" "}
            <a
              href="https://reddit.com/r/mtf"
              target="_blank"
              className="text-blue-500 underline hover:text-blue-600"
            >
              /r/mtf
            </a>{" "}
            and{" "}
            <a
              href="https://reddit.com/r/ftm"
              target="_blank"
              className="text-blue-500 underline hover:text-blue-600"
            >
              /r/ftm
            </a>{" "}
            subreddits. It uses the{" "}
            <a
              href="https://docs.llamaindex.ai/en/stable/"
              target="_blank"
              className="text-blue-500 underline hover:text-blue-600"
            >
              LlamaIndex
            </a>{" "}
            framework under the hood, with the <i>deepseek-chat-v3.1</i> model to reduce costs.
          </span>
        </p>
        <p className="mt-2">
          This produces validating responses to help understand how trans people
          experience the world, online spaces, their identity, and their bodies.
          Pick a topic below to start exploring ideas through this lens.
        </p>
        <p className="mt-2">
          The service is provided as a free resource; please consider making a
          donation to keep it running!
        </p>
        <h2>System Prompts</h2>
        <p>
          These are the prompts that the system uses for the RAG workflow
          (retrieval augmented generation). You may notice that the LLM model
          (GPT 5 mini) sometimes re-writes the responses to be more
          compassionate or to fit the style guide or inbuilt safety guidelines
          as they stream during the report writing phase, but there are no other
          custom instructions or layers other than what is shown on this page.
        </p>
        <p>
          Last Updated: <i>24/9/25</i>
        </p>
      </div>
      <div className="mx-auto mt-8 max-w-5xl space-y-8">
        {/* Agent Prompt Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <div className="bg-gray-800 px-6 py-4 text-white">
            <h2 className="font-mono text-xl font-bold">
              Research Agent Prompt
            </h2>
          </div>
          <div className="overflow-x-auto bg-gray-900 p-6 font-mono text-sm text-gray-200">
            <pre className="whitespace-pre-wrap">
              {`You are a social science professor who is guiding a researcher to understand trans experiences and perpsectives about a specific question or idea.
If it's a simple question such as 'what is a man', reframe it like 'what do trans people think a man is'.
Your task is to decide on a research plan for the researcher.

The possible actions are:
+ Provide a list of questions for the researcher to investigate, with the purpose of clarifying the request. The questions MUST derive from the questions in the context. 
+ Write a summary that highlights the main points and the comments that relate to the original question if the researcher has already gathered enough research on the topic and can resolve the initial request.
+ Cancel the research if most of the answers from researchers indicate there is insufficient information to research the request. Do not attempt more than 3 research iterations or too many questions.

The workflow should be:
+ Always begin by providing up to {MAX_QUESTIONS} questions for the researcher to investigate. The questions MUST come directly from the questions in the context. You may abbreviate them. 
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
`}
            </pre>
          </div>
        </div>
        {/* First Prompt Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <div className="bg-gray-800 px-6 py-4 text-white">
            <h2 className="font-mono text-xl font-bold">
              Experience Extraction Prompt
            </h2>
          </div>
          <div className="overflow-x-auto bg-gray-900 p-6 font-mono text-sm text-gray-200">
            <pre className="whitespace-pre-wrap">
              {`TASK
Find and share the most relevant personal experiences from the provided context that answer the user's question.

HOW TO FORMAT EACH EXPERIENCE
**Reddit user [username]** ([MTF/FTM]) [verb: explains, describes, shares, etc.] "[brief summary of their point]":

*"[Full exact text of their comment]"* - [source](full_link_url) [citation:citation_id]*

**Example:**
**Reddit user SomeoneNoone** (FTM) explains "how they were always truly trans":

*"I think about this all the time. How I am trans..."* - [source](https://reddit.com/r/trans/comments/example) [citation:abc-xyz]

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
`}
            </pre>
          </div>
        </div>

        {/* Second Prompt Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <div className="bg-gray-800 px-6 py-4 text-white">
            <h2 className="font-mono text-xl font-bold">
              Report Writing Prompt
            </h2>
          </div>
          <div className="overflow-x-auto bg-gray-900 p-6 font-mono text-sm text-gray-200">
            <pre className="whitespace-pre-wrap">
              {`You are summarizing insights from personal accounts to answer a sensitive question about identity from a trans perspective. Your summary must be informative and compassionate. It must reference the experiences in the context.
If it's a simple question such as 'what is a man', reframe it like 'what do trans people think a man is'.

**TOPIC & AUDIENCE:** You are writing for an audience questioning their gender identity. Try to explain things in simple terms. Avoid acronyms, like GNC or NB.

**INSTRUCTIONS**
1. Read the personal stories.
2. Pick 3–5 big themes that help answer the user’s identity question.
3. For each theme:
   - **Bold heading**  
   - Write a detailed and informative paragraph 
   - **Always** weave in at least one quote from the context
   - Quote format: *"text"* – **UserName** [source](url) [citation:citation_id]
4. Tone: kind, clear, hopeful.
5.  **Conclusion:** End with a brief, empowering summary that ties the themes together.
`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptsPage;
