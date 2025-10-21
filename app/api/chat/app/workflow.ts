import { agent } from "@llamaindex/workflow";
import { getCommentsIndex, getStoriesIndex } from "./data";
import { initSettings } from "./settings";
import { FunctionTool } from "llamaindex";

export const availableTags = [
  "trauma",
  "autism/neurodivergence",
  "adhd",
  "ocd intrusive thoughts",
  "puberty discomfort",
  "got top surgery",
  "got facial surgery",
  "got top surgery as part of male detransition",
  "got bottom surgery",
  "internalised homophobia",
  "internalised misogyny",
  "internalised misandry",
  "autogynephilia",
  "autoandrophilia",
  "started as non-binary",
  "escapism",
  "depression",
  "low self-esteem",
  "social anxiety and isolation",
  "bipolar",
  "borderline personality disorder",
  "suicidal ideation",
  "self-harm",
  "porn influence",
  "anime influence",
  "influenced online",
  "influenced by friends",
  "hated breasts",
  "benefited from non-affirming therapy",
  "eating disorder",
  "parental or medical coercion",
  "completely regrets transition",
  "partially regrets transition",
  "doesn't regret transition",
  "trans kid",
  "feminine boy",
  "tomboy",
  "took hormones",
  "DIY hormones",
  "took puberty blockers",
  "surgery complications",
  "medical complications",
  "now infertile",
  "body dysmorphia",
  "re-transitioned",
  "rapid onset gender dysphoria (ROGD)",
  "benefited from psychedelic drugs",
  "had religious background",
  "became religious",
  "only transitioned socially",
  "intersex",
  "asexual",
  "homosexual",
  "heterosexual",
  "bisexual",
  "sexuality changed",
  "social role discomfort",
  "fear of sexualization",
  "psychosis clarity",
  "depersonalisation",
  "mental health issues",
  "underlying health issues",
  "suspicious account",
  "hair loss",
  "chronic pain",
  "weight gain/loss",
  "bone density issues",
  "unsupportive family",
  "supportive family",
  "is parent (not trans themselves)",
  "is friend (not trans themselves)",
  "is researcher (not trans themselves)",
];

export const workflowFactory = async (reqBody: any) => {
  initSettings();
  
  // Store user context across tool calls
  let userContext: {
    gender?: string;
    genderConfidence?: string;
    applicableTags?: string[];
  } = {};

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
        userContext.gender = 'male';
        userContext.genderConfidence = 'medium';
        return { gender: 'male', confidence: 'medium' };
      } else if (femaleScore > maleScore) {
        userContext.gender = 'female';
        userContext.genderConfidence = 'medium';
        return { gender: 'female', confidence: 'medium' };
      }
      
      userContext.gender = 'unknown';
      userContext.genderConfidence = 'low';
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

  const tagClassificationTool = new FunctionTool(
    async ({ userMessage }: { userMessage: string }) => {
      const lowerMessage = userMessage.toLowerCase();
      const applicableTags: string[] = [];
      
      // Define keyword mappings for tags
      const tagKeywords: Record<string, string[]> = {
        "trauma": ["trauma", "traumatic", "abuse", "abused", "ptsd"],
        "autism/neurodivergence": ["autism", "autistic", "neurodivergent", "asperger", "spectrum"],
        "adhd": ["adhd", "attention deficit", "hyperactive"],
        "ocd intrusive thoughts": ["ocd", "obsessive", "compulsive", "intrusive thoughts"],
        "puberty discomfort": ["puberty", "pubescent", "adolescence", "teenage"],
        "got top surgery": ["top surgery", "mastectomy", "chest surgery", "breast removal"],
        "got facial surgery": ["facial surgery", "ffs", "facial feminization", "facial masculinization"],
        "got bottom surgery": ["bottom surgery", "srs", "genital surgery", "vaginoplasty", "phalloplasty"],
        "internalised homophobia": ["internalized homophobia", "internalised homophobia", "self-hatred", "gay shame"],
        "internalised misogyny": ["internalized misogyny", "internalised misogyny", "hated being female"],
        "internalised misandry": ["internalized misandry", "internalised misandry", "hated being male"],
        "depression": ["depression", "depressed", "sad", "hopeless", "suicidal"],
        "low self-esteem": ["low self-esteem", "self-worth", "confidence issues", "insecure"],
        "social anxiety and isolation": ["social anxiety", "isolated", "lonely", "withdrawn"],
        "bipolar": ["bipolar", "manic", "mood swings"],
        "borderline personality disorder": ["bpd", "borderline", "personality disorder"],
        "suicidal ideation": ["suicidal", "suicide", "self-harm", "cutting"],
        "self-harm": ["self-harm", "cutting", "self-injury"],
        "porn influence": ["porn", "pornography", "sexual content"],
        "anime influence": ["anime", "manga", "japanese media"],
        "influenced online": ["online", "internet", "social media", "tumblr", "reddit"],
        "influenced by friends": ["friends", "peer pressure", "social influence"],
        "eating disorder": ["eating disorder", "anorexia", "bulimia", "body image"],
        "body dysmorphia": ["body dysmorphia", "dysmorphic", "body image"],
        "took hormones": ["hormones", "testosterone", "estrogen", "hrt"],
        "DIY hormones": ["diy", "self-medicated", "without prescription"],
        "took puberty blockers": ["puberty blockers", "blockers", "lupron"],
        "surgery complications": ["complications", "surgical problems", "botched"],
        "medical complications": ["medical issues", "health problems", "side effects"],
        "rapid onset gender dysphoria (ROGD)": ["rogd", "rapid onset", "sudden dysphoria"],
        "mental health issues": ["mental health", "psychiatric", "psychological"],
        "unsupportive family": ["unsupportive family", "family rejection", "parents rejected"],
        "supportive family": ["supportive family", "family support", "parents supported"],
      };
      
      // Check for tag matches
      for (const [tag, keywords] of Object.entries(tagKeywords)) {
        for (const keyword of keywords) {
          if (lowerMessage.includes(keyword)) {
            if (!applicableTags.includes(tag)) {
              applicableTags.push(tag);
            }
          }
        }
      }
      
      // Store in context
      userContext.applicableTags = applicableTags;
      
      return { 
        applicableTags,
        totalTagsFound: applicableTags.length,
        message: applicableTags.length > 0 
          ? `Found ${applicableTags.length} applicable tags: ${applicableTags.join(', ')}`
          : "No specific tags identified from the message"
      };
    },
    {
      name: "classify_user_tags",
      description: "Analyze the user's message to determine which tags from the available tag list apply to their situation",
      parameters: {
        type: "object",
        properties: {
          userMessage: {
            type: "string",
            description: "The user's message to analyze for applicable tags",
          },
        },
        required: ["userMessage"],
      },
    }
  );

  const commentsEngineTool = new FunctionTool(
    async ({ query }: { query: string }) => {
      const commentsIndex = await getCommentsIndex(reqBody?.data, userContext.applicableTags);
      const queryEngine = commentsIndex.asQueryEngine();
      const response = await queryEngine.query({ query });
      return response.toString();
    },
    {
      name: "query_user_comments",
      description: "Retrieve reddit comments related to detransition, filtered by the user's applicable tags",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query for finding relevant comments",
          },
        },
        required: ["query"],
      },
    }
  );

  const storiesEngineTool = new FunctionTool(
    async ({ query }: { query: string }) => {
      const storiesIndex = await getStoriesIndex(reqBody?.data, userContext.applicableTags);
      const queryEngine = storiesIndex.asQueryEngine();
      const response = await queryEngine.query({ query });
      return response.toString();
    },
    {
      name: "query_user_stories", 
      description: "Retrieve first person detransition stories and experiences, filtered by the user's applicable tags",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string", 
            description: "The search query for finding relevant stories",
          },
        },
        required: ["query"],
      },
    }
  );

  return agent({ 
    tools: [genderClassificationTool, tagClassificationTool, commentsEngineTool, storiesEngineTool],
    systemPrompt: `You are a helpful assistant that provides information about detransition experiences. 

IMPORTANT WORKFLOW:
1. First, determine the user's gender using the classify_user_gender tool
2. Then, identify applicable tags using the classify_user_tags tool  
3. Finally, use the query tools (query_user_comments and query_user_stories) which will automatically filter results by the identified tags

The tag classification helps ensure you find the most relevant experiences that match the user's specific situation and background.

After gathering information:
- Provide thoughtful, empathetic responses based on the retrieved information
- Be sensitive to the user's experience and avoid making assumptions beyond what they've shared
- Reference specific experiences from the filtered results when relevant`
  });
};
