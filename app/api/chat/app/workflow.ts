import { agent } from "@llamaindex/workflow";
import { getCommentsIndex, getStoriesIndex } from "./data";
import { initSettings } from "./settings";
import { FunctionTool } from "llamaindex";

export const workflowFactory = async (reqBody: any) => {
  initSettings();
  const commentsIndex = await getCommentsIndex(reqBody?.data);
  const storiesIndex = await getStoriesIndex(reqBody?.data);

  const genderClassificationTool = new FunctionTool(
    async ({ userMessage }: { userMessage: string }) => {
      // Analyze the user's message to determine gender
      const lowerMessage = userMessage.toLowerCase();
      
      // Look for explicit gender indicators
      const maleIndicators = [
        'i am a man', 'i am male', 'i\'m a man', 'i\'m male', 'as a man', 'as a male',
        'i was a boy', 'when i was a boy', 'ftm', 'female to male', 'trans man', 'transman'
      ];
      
      const femaleIndicators = [
        'i am a woman', 'i am female', 'i\'m a woman', 'i\'m female', 'as a woman', 'as a female',
        'i was a girl', 'when i was a girl', 'mtf', 'male to female', 'trans woman', 'transwoman'
      ];
      
      for (const indicator of maleIndicators) {
        if (lowerMessage.includes(indicator)) {
          return { gender: 'male', confidence: 'high' };
        }
      }
      
      for (const indicator of femaleIndicators) {
        if (lowerMessage.includes(indicator)) {
          return { gender: 'female', confidence: 'high' };
        }
      }
      
      // Look for pronouns and other contextual clues
      const malePronouns = ['he/him', 'his', 'himself'];
      const femalePronouns = ['she/her', 'hers', 'herself'];
      
      let maleScore = 0;
      let femaleScore = 0;
      
      for (const pronoun of malePronouns) {
        if (lowerMessage.includes(pronoun)) maleScore++;
      }
      
      for (const pronoun of femalePronouns) {
        if (lowerMessage.includes(pronoun)) femaleScore++;
      }
      
      if (maleScore > femaleScore) {
        return { gender: 'male', confidence: 'medium' };
      } else if (femaleScore > maleScore) {
        return { gender: 'female', confidence: 'medium' };
      }
      
      return { gender: 'unknown', confidence: 'low' };
    },
    {
      name: "classify_user_gender",
      description: "Analyze the user's message to determine their gender (male/female) based on explicit statements, pronouns, and contextual clues",
      parameters: {
        type: "object",
        properties: {
          userMessage: {
            type: "string",
            description: "The user's message to analyze for gender indicators",
          },
        },
        required: ["userMessage"],
      },
    }
  );

  const commentsEngineTool = commentsIndex.queryTool({
    metadata: {
      name: "query_user_comments",
      description: `This tool can retrieve reddit comments related to detransition. Use this after determining the user's gender to find relevant comments.`,
    },
    includeSourceNodes: true,
  });

  const storiesEngineTool = storiesIndex.queryTool({
    metadata: {
      name: "query_user_stories",
      description: `This tool can return first person detransition stories and experiences. Use this after determining the user's gender to find relevant stories.`,
    },
    includeSourceNodes: true,
  });

  return agent({ 
    tools: [genderClassificationTool, commentsEngineTool, storiesEngineTool],
    systemPrompt: `You are a helpful assistant that provides information about detransition experiences. 

IMPORTANT: Always start by determining the user's gender using the classify_user_gender tool before using any other tools. This helps provide more relevant and personalized responses.

After determining gender:
- Use query_user_comments to find relevant reddit comments
- Use query_user_stories to find relevant personal stories
- Provide thoughtful, empathetic responses based on the retrieved information
- Be sensitive to the user's experience and avoid making assumptions beyond what they've shared`
  });
};
