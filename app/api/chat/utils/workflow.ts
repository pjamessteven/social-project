import {
  agentToolCallEvent,
  agentToolCallResultEvent,
  startAgentEvent,
  WorkflowStream,
  type AgentInputData,
  type Workflow,
  type WorkflowContext,
  type WorkflowEventData,
} from "@llamaindex/workflow";
import {
  type Metadata,
  type NodeWithScore,
} from "llamaindex";
import {
  artifactEvent,
  sourceEvent,
  toAgentRunEvent,
  toSourceEvent,
  type SourceEventNode,
} from "./events";
import { downloadFile } from "./file";
import {
  resumeWorkflowFromHumanResponses,
  type HumanResponseEventData,
} from "./hitl/index";
import { toInlineAnnotationEvent } from "./inline";

export async function runWorkflow({
  workflow,
  input,
  human,
}: {
  workflow: Workflow;
  input: AgentInputData;
  human?: {
    snapshotId?: string | undefined; // the snapshot id to restore workflow
    responses?: HumanResponseEventData[]; // the data from human to trigger events after restoring
  };
}): Promise<WorkflowContext> {
  let context: WorkflowContext;

  if (human?.responses?.length && human?.snapshotId) {
    // resume the workflow if there is human response
    console.log(1)
    context = await resumeWorkflowFromHumanResponses(
      workflow,
      human.responses,
      human.snapshotId,
    );
        console.log(2)
  } else {
    // otherwise, create a new empty context and run the workflow with startAgentEvent
        console.log(3)
    context = workflow.createContext();
    context.sendEvent(
      startAgentEvent.with({
        userInput: input.userInput,
        chatHistory: input.chatHistory,
      }),
    );
        console.log(4)
  }

  return context;
}

export function processWorkflowStream(
  stream: WorkflowStream<WorkflowEventData<unknown>>,
) {
  return stream.pipeThrough(
    new TransformStream<WorkflowEventData<unknown>, WorkflowEventData<unknown>>(
      {
        async transform(event, controller) {
          let transformedEvent = event;
          console.log('piping', event)
          // Handle agent events from AgentToolCall
          if (agentToolCallEvent.include(event)) {
            console.log('[TOOL CALL] Tool being called:', {
              toolName: event.data.toolName,
              agentName: event.data.agentName,
              toolKwargs: event.data.toolKwargs
            });
            const inputString = JSON.stringify(event.data.toolKwargs);
            transformedEvent = toAgentRunEvent({
              agent: event.data.agentName,
              text: `Using tool: '${event.data.toolName}' with inputs: '${inputString}'`,
              type: "text",
            });
          }
          // Handle source nodes from AgentToolCallResult
          else if (agentToolCallResultEvent.include(event)) {
            console.log('[TOOL RESULT] Tool call result received:', {
              toolName: event.data.toolName,
              agentName: event.data.agentName,
              hasRaw: !!event.data.raw
            });
            const rawOutput = event.data.raw;
            console.log('[TOOL RESULT] Raw output structure:', {
              type: typeof rawOutput,
              isObject: typeof rawOutput === "object",
              hasSourceNodes: rawOutput && typeof rawOutput === "object" && "sourceNodes" in rawOutput,
              keys: rawOutput && typeof rawOutput === "object" ? Object.keys(rawOutput) : null
            });
            
            if (
              rawOutput &&
              typeof rawOutput === "object" &&
              "sourceNodes" in rawOutput // TODO: better use Zod to validate and extract sourceNodes from toolCallResult
            ) {
              const sourceNodes =
                rawOutput.sourceNodes as unknown as NodeWithScore<Metadata>[];
              console.log('[TOOL RESULT] Found source nodes:', {
                count: sourceNodes?.length || 0,
                firstNodeId: sourceNodes?.[0]?.node?.id_ || 'none'
              });
              transformedEvent = toSourceEvent(sourceNodes);
            } else {
              console.log('[TOOL RESULT] No source nodes found in raw output');
            }
          }
          // Handle artifact events, transform to agentStreamEvent
          else if (artifactEvent.include(event)) {
                                              console.log('piping 5')
            transformedEvent = toInlineAnnotationEvent(event);
                                              console.log('piping 6')
          }


          controller.enqueue(transformedEvent);
        },
      },
    ),
  );
}

