import { agent } from "@llamaindex/workflow";
import { getCommentsIndex, getStoriesIndex } from "./data";
import { initSettings } from "./settings";

export const workflowFactory = async (reqBody: any) => {
  initSettings();
  const commentsIndex = await getCommentsIndex(reqBody?.data);
  const storiesIndex = await getStoriesIndex(reqBody?.data);

  const commentsEngineTool = commentsIndex.queryTool({
    metadata: {
      name: "query_user_comments",
      description: `This tool can retrieve reddit comments related to detransition`,
    },
    includeSourceNodes: true,
  });

  const storiesEngineTool = storiesIndex.queryTool({
    metadata: {
      name: "query_user_stories",
      description: `This tool can return first person detransition stories and experiences`,
    },
    includeSourceNodes: true,
  });

  return agent({ tools: [commentsEngineTool, storiesEngineTool] });
};
