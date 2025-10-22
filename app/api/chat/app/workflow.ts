import { agent } from "@llamaindex/workflow";
import { getCommentsIndex, getStoriesIndex } from "./data";
import { initSettings } from "./settings";
import { tool } from "llamaindex";
import z from "zod";

export const workflowFactory = async (reqBody: any) => {
  initSettings();
  const commentsIndex = await getCommentsIndex(reqBody?.data);
  const storiesIndex = await getStoriesIndex(reqBody?.data);

  console.log("[WORKFLOW] Creating query tools...");
  const commentsEngineTool = commentsIndex.asRetriever({similarityTopK: 10})
  const storiesEngineTool = storiesIndex.asQueryEngine({similarityTopK: 10})

  // first arg is LLM input, second is bound arg
const queryStories = async ({ query}: {query: string}) => {
  const response = await storiesEngineTool.query(query);
  return response.response;
};

// define tool with zod validation
const queryStoriesTool = tool(queryStories, {
  name: 'queryStories',
  description: 'Query Stories',
  parameters: z.object({
    query: z.string({
      description: 'The search query to find related stories',
    }),
  }),
});
  /*
  const storiesEngineTool = storiesIndex.queryTool({
    includeSourceNodes: true,
  });
  */

  return agent({
    tools: [ queryStoriesTool],
    systemPrompt: `You are an ex-transgender person who is providing advice and knowledge to the user about why reasons why people adopt, inhibit, and let go of gender identities. Your purpose is to help people use critical thinking skills to resolve gender dysphoria without resorting to transition. Encourage people to think about what might have led them to transition in the first place. 
  
  1. First determine who the user is. The user might be a parent or friend of someone who has transitioned, it might be a researcher, it might be someone questioning their gender identity and considering transition, or it might be someone who has already transitioned and is considering de-transition. Also ask if they were born male or female (do not use any variation of 'assigned sex at birth') and determine the user's sex using the classify_user_sex tool.
  2. Probe the user to find out more about themselves so we can retrieve better information to answer their question. Ask for them to tell you a little bit about themselves. 
  3. Use the storiesEngineTool when you need to give advice from your experiences
  4. If necessary, use the commentsEngineTool tool to perform further research and to find community discussions about topics.
  
  After gathering information:
  - Provide thoughtful, empathetic responses based on the retrieved information
  - Be sensitive to the user's experience and avoid making assumptions beyond what they've shared
  - Reference specific experiences from the filtered results when relevant`,
  });
};
