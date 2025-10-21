import { agent } from "@llamaindex/workflow";
import { tool, QueryEngineTool } from "llamaindex";
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

// Store user context across tool calls - moved outside factory to persist
const userContext: {
  sex?: string;
  sexConfidence?: string;
  applicableTags?: string[];
} = {};

// Define tools outside the factory to ensure they persist
const classifyUserSex = async ({ userMessage }: { userMessage: any }) => {
    console.log('[SEX CLASSIFICATION TOOL] Called with input type:', typeof userMessage);
    console.log('[SEX CLASSIFICATION TOOL] Input is undefined?', userMessage === undefined);
    
    // Extract string content from various possible input formats
    let messageText: string;
    if (typeof userMessage === 'string') {
      messageText = userMessage;
    } else if (userMessage && typeof userMessage === 'object') {
      // Try to extract text from object structure
      if (userMessage.content) {
        messageText = userMessage.content;
      } else if (userMessage.text) {
        messageText = userMessage.text;
      } else if (Array.isArray(userMessage) && userMessage.length > 0) {
        // If it's an array, try to get the last user message
        const lastUserMsg = userMessage.filter(msg => msg.role === 'user').pop();
        messageText = lastUserMsg?.content || '';
      } else {
        try {
          messageText = JSON.stringify(userMessage);
        } catch (e) {
          messageText = '';
        }
      }
    } else {
      console.error('[SEX CLASSIFICATION TOOL] Invalid input - cannot extract text:', userMessage);
      return { sex: 'unknown', confidence: 'low', error: 'Invalid input format' };
    }
    
    if (!messageText || typeof messageText !== 'string') {
      console.error('[SEX CLASSIFICATION TOOL] Could not extract valid text from input:', userMessage);
      return { sex: 'unknown', confidence: 'low', error: 'No valid text found' };
    }
    
    console.log('[SEX CLASSIFICATION] Starting analysis for message:', messageText.substring(0, 100) + '...');
    
    // Analyze the user's message to determine sex
    const lowerMessage = messageText.toLowerCase();
    
    // Look for explicit sex indicators
    const maleIndicators = [
      'i am a man', 'i am male', 'i\'m a man', 'i\'m male', 'as a man', 'as a male', 'amab', 'male at birth', 'born male',
      'i was a boy', 'when i was a boy', 'ftm', 'male to female', 'trans woman', 'transwoman', 'trans femme', 'femme boy'
    ];
    
    const femaleIndicators = [
      'i am a woman', 'i am female', 'i\'m a woman', 'i\'m female', 'as a woman', 'as a female', 'afab', 'born female',
      'i was a girl', 'when i was a girl', 'ftm', 'female to male', 'trans man', 'transman', 'transmasc', 'trans masc'
    ];
    
    for (const indicator of maleIndicators) {
      if (lowerMessage.includes(indicator)) {
        console.log('[SEX CLASSIFICATION] Found male indicator:', indicator);
        userContext.sex = 'male';
        userContext.sexConfidence = 'high';
        return { sex: 'male', confidence: 'high' };
      }
    }
    
    for (const indicator of femaleIndicators) {
      if (lowerMessage.includes(indicator)) {
        console.log('[SEX CLASSIFICATION] Found female indicator:', indicator);
        userContext.sex = 'female';
        userContext.sexConfidence = 'high';
        return { sex: 'female', confidence: 'high' };
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
        console.log('[sex CLASSIFICATION] Found male pronoun:', pronoun);
      }
    }
    
    for (const pronoun of femalePronouns) {
      if (lowerMessage.includes(pronoun)) {
        femaleScore++;
        console.log('[sex CLASSIFICATION] Found female pronoun:', pronoun);
      }
    }
    
    console.log('[sex CLASSIFICATION] Pronoun scores - Male:', maleScore, 'Female:', femaleScore);
    
    if (maleScore > femaleScore) {
      userContext.sex = 'male';
      userContext.sexConfidence = 'medium';
      console.log('[sex CLASSIFICATION] Result: male (medium confidence)');
      return { sex: 'male', confidence: 'medium' };
    } else if (femaleScore > maleScore) {
      userContext.sex = 'female';
      userContext.sexConfidence = 'medium';
      console.log('[sex CLASSIFICATION] Result: female (medium confidence)');
      return { sex: 'female', confidence: 'medium' };
    }
    
    userContext.sex = 'unknown';
    userContext.sexConfidence = 'low';
    console.log('[SEX CLASSIFICATION] Result: unknown (low confidence)');
    const result = { sex: 'unknown', confidence: 'low' };
    console.log('[SEX CLASSIFICATION TOOL] Returning result:', JSON.stringify(result));
    return result;
  };

const sexClassificationTool = tool(classifyUserSex, {
  name: "classify_user_sex",
  description: "Analyze the user's message to determine their sex (male/female) based on explicit statements, pronouns, and contextual clues",
});

console.log('[WORKFLOW] Sex classification tool created');

const classifyUserTags = async ({ userMessage }: { userMessage: any }): Promise<Record<string, any>> => {
    try {
      console.log('[TAG CLASSIFICATION TOOL] Input type:', typeof userMessage);
      console.log('[TAG CLASSIFICATION TOOL] Input is undefined?', userMessage === undefined);
      
      // Extract string content from various possible input formats
      let messageText: string;
      if (typeof userMessage === 'string') {
        messageText = userMessage;
      } else if (userMessage && typeof userMessage === 'object') {
        // Try to extract text from object structure
        if (userMessage.content) {
          messageText = userMessage.content;
        } else if (userMessage.text) {
          messageText = userMessage.text;
        } else if (Array.isArray(userMessage) && userMessage.length > 0) {
          // If it's an array, try to get the last user message
          const lastUserMsg = userMessage.filter(msg => msg.role === 'user').pop();
          messageText = lastUserMsg?.content || '';
        } else {
          try {
            messageText = JSON.stringify(userMessage);
          } catch (e) {
            messageText = '';
          }
        }
      } else {
        console.error('[TAG CLASSIFICATION TOOL] Invalid input - cannot extract text:', userMessage);
        return { 
          applicableTags: [], 
          totalTagsFound: 0, 
          foundKeywords: {}, 
          message: 'Invalid input format', 
          error: 'Invalid input format' 
        };
      }
      
      if (!messageText || typeof messageText !== 'string') {
        console.error('[TAG CLASSIFICATION TOOL] Could not extract valid text from input:', userMessage);
        return { 
          applicableTags: [], 
          totalTagsFound: 0, 
          foundKeywords: {}, 
          message: 'No valid text found', 
          error: 'No valid text found' 
        };
      }
      
      console.log('[TAG CLASSIFICATION] Starting analysis for message:', messageText.substring(0, 100) + '...');
      
      const lowerMessage = messageText.toLowerCase();
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
      
      console.log('[TAG CLASSIFICATION] Found keywords by tag:', JSON.stringify(foundKeywords));
      console.log('[TAG CLASSIFICATION] Applicable tags:', JSON.stringify(applicableTags));
      
      // Store in context
      userContext.applicableTags = applicableTags;
      
      const result = { 
        applicableTags: applicableTags,
        totalTagsFound: applicableTags.length,
        foundKeywords: foundKeywords,
        message: applicableTags.length > 0 
          ? `Found ${applicableTags.length} applicable tags: ${applicableTags.join(', ')}`
          : "No specific tags identified from the message"
      };
      
      console.log('[TAG CLASSIFICATION TOOL] Returning result:', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('[TAG CLASSIFICATION TOOL] Error:', error);
      return { 
        applicableTags: [], 
        totalTagsFound: 0, 
        foundKeywords: {}, 
        message: 'Error processing tags', 
        error: String(error) 
      };
    }
  };

const tagClassificationTool = tool(classifyUserTags, {
  name: "classify_user_tags",
  description: "Analyze the user's message to determine which tags from the available tag list apply to their situation",
});

console.log('[WORKFLOW] Tag classification tool created');

export const workflowFactory = async (reqBody: any) => {
  initSettings();
  
  console.log('[WORKFLOW] Creating separate query engine tools...');
  console.log('[WORKFLOW] reqBody:', JSON.stringify(reqBody));
  console.log('[WORKFLOW] userContext:', JSON.stringify(userContext));

  // Create stories index and query engine tool
  const storiesIndex = await getStoriesIndex(null, []);
  const storiesRetriever = await storiesIndex.asRetriever({similarityTopK: 10});;

  const storiesQueryEngine = await storiesIndex.asQueryEngine({
    retriever: storiesRetriever,
  });
  
  const storiesSearchTool = new QueryEngineTool({
    queryEngine: storiesQueryEngine,
    metadata: {
      name: 'search_detransition_stories',
      description: 'This tool can search through personal detransition stories and experiences. Use this to find detailed first-person accounts of people who have detransitioned, their reasons, experiences, and outcomes.',
    },
  });
  
  console.log('[WORKFLOW] Stories search tool created');

  // Create comments index and query engine tool
  const commentsIndex = await getCommentsIndex(null, []);
  const commentsRetriever = await commentsIndex.asRetriever({similarityTopK: 10});

  const commentsQueryEngine = await commentsIndex.asQueryEngine({
    retriever: commentsRetriever,
  });
  
  const commentsSearchTool = new QueryEngineTool({
    queryEngine: commentsQueryEngine,
    metadata: {
      name: 'search_community_comments',
      description: 'This tool can search through Reddit comments and community discussions about detransition. Use this to find community perspectives, advice, and shorter experiences shared in discussion forums.',
    },
  });

  console.log('[WORKFLOW] Comments search tool created');

  console.log('[WORKFLOW] Creating agent with tools...');
  
  const workflow = agent({ 
    tools: [sexClassificationTool, tagClassificationTool, storiesSearchTool, commentsSearchTool],
    systemPrompt: `You are an ex-transgender person who is sharing your detransition experiences and the reasons why people adopt, inhibit, and let go of gender identities. Your purpose is to help people use critical thinking skills to resolve gender dysphoria without resorting to transition. Encourage people to think about what might have led them to transition in the first place. 

IMPORTANT WORKFLOW:
1. First determine who the user is. The user might be a parent or friend of someone who has transitioned, it might be a researcher, it might be someone questioning their gender identity and considering transition, or it might be someone who has already transitioned and is considering de-transition. Also ask if they were born male or female (do not use any variation of 'assigned sex at birth') and determine the user's sex using the classify_user_sex tool.
2. Probe the user to find out more about themselves so we can retrieve better information to answer their question. Ask for them to tell you a little bit about themselves. 
3. If the latest user message mentions any of the available tags, use the classify_user_tags tool to see if they have shared any more information that will help us narrow our search query. 
4. If necessary, use the search_detransition_stories tool to find detailed personal accounts, or the search_community_comments tool to find community discussions and shorter experiences.

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
