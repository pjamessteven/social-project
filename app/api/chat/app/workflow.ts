import { agent } from "@llamaindex/workflow";
import { tool } from "llamaindex";
import { z } from "zod";
import { getCommentsIndex, getStoriesIndex } from "./data";
import { initSettings } from "./settings";

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
  const userContext: {
    gender?: string;
    genderConfidence?: string;
    applicableTags?: string[];
  } = {};

  console.log('[WORKFLOW] Creating gender classification tool...');
  const classifyUserGender = async ({ userMessage }: { userMessage: string }) => {
    console.log('[GENDER CLASSIFICATION] Starting analysis for message:', userMessage.substring(0, 100) + '...');
    
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
        console.log('[GENDER CLASSIFICATION] Found male indicator:', indicator);
        userContext.gender = 'male';
        userContext.genderConfidence = 'high';
        return { gender: 'male', confidence: 'high' };
      }
    }
    
    for (const indicator of femaleIndicators) {
      if (lowerMessage.includes(indicator)) {
        console.log('[GENDER CLASSIFICATION] Found female indicator:', indicator);
        userContext.gender = 'female';
        userContext.genderConfidence = 'high';
        return { gender: 'female', confidence: 'high' };
      }
    }
    
    // Look for pronouns and other contextual clues
    const malePronouns = ['he/him', 'his', 'himself'];
    const femalePronouns = ['she/her', 'hers', 'herself'];
    
    let maleScore = 0;
    let femaleScore = 0;
    
    for (const pronoun of malePronouns) {
      if (lowerMessage.includes(pronoun)) {
        maleScore++;
        console.log('[GENDER CLASSIFICATION] Found male pronoun:', pronoun);
      }
    }
    
    for (const pronoun of femalePronouns) {
      if (lowerMessage.includes(pronoun)) {
        femaleScore++;
        console.log('[GENDER CLASSIFICATION] Found female pronoun:', pronoun);
      }
    }
    
    console.log('[GENDER CLASSIFICATION] Pronoun scores - Male:', maleScore, 'Female:', femaleScore);
    
    if (maleScore > femaleScore) {
      userContext.gender = 'male';
      userContext.genderConfidence = 'medium';
      console.log('[GENDER CLASSIFICATION] Result: male (medium confidence)');
      return { gender: 'male', confidence: 'medium' };
    } else if (femaleScore > maleScore) {
      userContext.gender = 'female';
      userContext.genderConfidence = 'medium';
      console.log('[GENDER CLASSIFICATION] Result: female (medium confidence)');
      return { gender: 'female', confidence: 'medium' };
    }
    
    userContext.gender = 'unknown';
    userContext.genderConfidence = 'low';
    console.log('[GENDER CLASSIFICATION] Result: unknown (low confidence)');
    return { gender: 'unknown', confidence: 'low' };
  };

  const genderClassificationTool = tool(classifyUserGender, {
    name: "classify_user_gender",
    description: "Analyze the user's message to determine their gender (male/female) based on explicit statements, pronouns, and contextual clues",
    parameters: z.object({
      userMessage: z.string({
        description: "The user's message to analyze for gender indicators",
      }),
    }),
  });

  console.log('[WORKFLOW] Creating tag classification tool...');
  const classifyUserTags = async ({ userMessage }: { userMessage: string }) => {
    console.log('[TAG CLASSIFICATION] Starting analysis for message:', userMessage.substring(0, 100) + '...');
    
    const lowerMessage = userMessage.toLowerCase();
    const applicableTags: string[] = [];
    const foundKeywords: Record<string, string[]> = {};
    
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
            foundKeywords[tag] = [];
          }
          foundKeywords[tag].push(keyword);
        }
      }
    }
    
    console.log('[TAG CLASSIFICATION] Found keywords by tag:', foundKeywords);
    console.log('[TAG CLASSIFICATION] Applicable tags:', applicableTags);
    
    // Store in context
    userContext.applicableTags = applicableTags;
    
    return { 
      applicableTags,
      totalTagsFound: applicableTags.length,
      foundKeywords,
      message: applicableTags.length > 0 
        ? `Found ${applicableTags.length} applicable tags: ${applicableTags.join(', ')}`
        : "No specific tags identified from the message"
    };
  };

  const tagClassificationTool = tool(classifyUserTags, {
    name: "classify_user_tags",
    description: "Analyze the user's message to determine which tags from the available tag list apply to their situation",
    parameters: z.object({
      userMessage: z.string({
        description: "The user's message to analyze for applicable tags",
      }),
    }),
  });

  console.log('[WORKFLOW] Creating combined search tool...');
  const searchExperiences = async ({ query }: { query: string }) => {
    console.log('[COMBINED SEARCH] Starting search with query:', query);
    console.log('[COMBINED SEARCH] User context:', userContext);
    console.log('[COMBINED SEARCH] Applied tags:', userContext.applicableTags);
    
    const { searchCombinedContent } = await import('./data');
    const results = await searchCombinedContent(query, reqBody?.data, userContext.applicableTags);
    
    console.log('[COMBINED SEARCH] Search completed, results length:', results.length);
    console.log('[COMBINED SEARCH] Results preview:', results.substring(0, 500) + '...');
    
    return results;
  };

  const combinedSearchTool = tool(searchExperiences, {
    name: "search_experiences",
    description: "Search both detransition stories and reddit comments, returning the most relevant results based on similarity, first-person content, and community engagement",
    parameters: z.object({
      query: z.string({
        description: "The search query for finding relevant detransition experiences and comments",
      }),
    }),
  });

  const workflow = agent({ 
    tools: [genderClassificationTool, tagClassificationTool, combinedSearchTool],
    systemPrompt: `You are a helpful assistant that provides information about detransition experiences and the reasons why people adopt, inhibit, and let go of gender identities. Your purpose is to help people resolve gender dysphoria without resorting to transition.

IMPORTANT WORKFLOW:
1. First determine who the user is. The user might be a parent or friend of someone who has transitioned, it might be a researcher, it might be someone questioning their gender identity and considering transition, or it might be someone who has already transitioned and is considering de-transition. Also ask if they were born male or female (do not use any variation of 'assigned sex at birth') and determine the user's gender using the classify_user_gender tool.
2. Probe the user to find out more about themselves so we can retrieve better information to answer their question. Ask for them to tell you a little bit about themselves. 
3. If the latest user message mentions any of the available tags, use the classify_user_tags tool to see if they have shared any more information that will help us narrow our search query. 
4. If necessary, use the search_experiences tool to search for relevant stories and comments.

The tag classification helps ensure you find the most relevant experiences that match the user's specific situation and background.
When you identify tags, mention them to the user like: "Based on what you've shared, I'm filtering results using these relevant tags: [tag1, tag2, tag3]"                                          

available tags: 
${availableTags}

After gathering information:
- Provide thoughtful, empathetic responses based on the retrieved information
- Be sensitive to the user's experience and avoid making assumptions beyond what they've shared
- Reference specific experiences from the filtered results when relevant`
  });

  console.log('[WORKFLOW] Created workflow with tools');
  
  return workflow;
};
